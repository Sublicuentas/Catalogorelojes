// ============================================================
//  /api/cartelera.js   —  Funcion Serverless de Vercel (CommonJS)
// ============================================================
//  - LISTA todas las apps de una vez:   /api/cartelera            -> {byProvider:{netflix:[...],...}}
//  - LISTA una sola app:                /api/cartelera?provider=netflix
//  - DETALLE:                           /api/cartelera?id=123&type=tv
//
//  CLAVE: deduplica GLOBAL -> cada titulo aparece en UNA sola app
//  (la app donde es mas popular en Honduras). Region = HN.
//  Acepta clave v3 (corta) o token v4 (largo con puntos).
// ============================================================

const PROVIDERS = {
  netflix:     8,
  disney:      337,
  hbomax:      1899,  // Max. Alternativos: 384, 615
  prime:       119,   // Prime Video. Alternativo: 9
  paramount:   531,
  crunchyroll: 283
};
// Orden de prioridad cuando un titulo aparece en varias apps:
// se queda en la primera de esta lista donde aparezca.
// Netflix primero (es la mas grande/exclusiva en LatAm), luego Crunchyroll (anime),
// despues el resto. Asi titulos como Rosario Tijeras se quedan en Netflix.
const PRIORITY = ['netflix','crunchyroll','disney','hbomax','paramount','prime'];

const REGION = 'MX';   // Mexico = mismo catalogo que Honduras pero datos mas completos en TMDB
const LANG   = 'es-MX';
const IMG    = 'https://image.tmdb.org/t/p/';

// ============================================================
//  LISTA CURADA de NOVELAS y ANIMES por app (nombres reales).
//  El codigo busca cada nombre en TMDB para traer poster/año/rating.
//  Editar libremente: agregar o quitar titulos por app.
//  type: 'tv' o 'movie' (la mayoria de novelas/animes son 'tv').
// ============================================================
const CURATED = {
  netflix: {
    novela: [
      'Café con aroma de mujer','Pasión de gavilanes','La reina del flow','Rosario Tijeras',
      'Yo soy Betty, la fea','Sin senos sí hay paraíso','La casa de las flores','Oscuro deseo',
      'Rebelde','Bolívar','Romina poderosa','Cien años de soledad','La venganza de Analía',
      'Pálpito','Distrito Salvaje','Always a Witch','El final del paraíso'
    ],
    anime: [
      'One Piece','Naruto','Jujutsu Kaisen','Demon Slayer','Attack on Titan','My Hero Academia',
      'Hunter x Hunter','Death Note','Bleach','Tokyo Revengers','Spy x Family','Chainsaw Man',
      'Black Clover','Vinland Saga','Baki'
    ]
  },
  hbomax: {
    novela: [
      'La que se avecina','Sin senos no hay paraíso','El Señor de los Cielos','La Reina del Sur',
      'Rubí','Teresa','Cuna de lobos','La usurpadora'
    ],
    anime: [
      'Studio Ghibli','El viaje de Chihiro','La princesa Mononoke','Mi vecino Totoro','Adventure Time',
      'Rick and Morty','Looney Tunes'
    ]
  },
  disney: {
    novela: [
      'Rebelde','Violetta','Soy Luna','Patito Feo','Chica Vampiro','Cómplices al rescate'
    ],
    anime: [
      'Doraemon','Bluey','Los Simpson','Phineas y Ferb','Gravity Falls','Star vs las Fuerzas del Mal'
    ]
  },
  prime: {
    novela: [
      'Pasión de gavilanes','Sin senos sí hay paraíso','La Reina del Sur','El Clon','Marimar',
      'María la del Barrio'
    ],
    anime: [
      'Dragon Ball Z','Dragon Ball','Pokémon','Sailor Moon','Inuyasha','Yu-Gi-Oh'
    ]
  },
  paramount: {
    novela: [
      'Rubí','Teresa','La Madrastra','Triunfo del Amor','Soy tu dueña','Abismo de pasión'
    ],
    anime: [
      'Bob Esponja','Avatar: La leyenda de Aang','Las Tortugas Ninja','Los Padrinos Mágicos'
    ]
  },
  crunchyroll: {
    novela: [],
    anime: [
      'One Piece','Naruto Shippuden','Jujutsu Kaisen','Demon Slayer','Attack on Titan','My Hero Academia',
      'Bleach','Black Clover','Tokyo Revengers','Chainsaw Man','Spy x Family','Dragon Ball Super',
      'Hunter x Hunter','One Punch Man','Mob Psycho 100','Solo Leveling','Blue Lock','Frieren'
    ]
  }
};

function buildAuth(key){
  const isV4 = key.length > 50 && key.indexOf('.') !== -1;
  return { headers: isV4 ? { Authorization: 'Bearer ' + key } : {}, authQ: isV4 ? '' : ('api_key=' + key + '&') };
}

module.exports = async (req, res) => {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) return res.status(500).json({ error: 'Falta TMDB_API_KEY (haz Redeploy)' });
    const { headers, authQ } = buildAuth(key);
    const api = 'https://api.themoviedb.org/3/';

    // ---------- MODO DETALLE ----------
    const id = req.query && req.query.id;
    if (id) {
      const type = (req.query.type === 'tv') ? 'tv' : 'movie';
      const u = api + type + '/' + encodeURIComponent(id) + '?' + authQ + 'language=';
      const d = await fetch(u + LANG, { headers }).then(r => r.json());
      let overview = d.overview || '';
      if (!overview) {
        const de = await fetch(u + 'en-US', { headers }).then(r => r.json()).catch(() => ({}));
        overview = de.overview || '';
      }
      const sl = (d.spoken_languages && d.spoken_languages[0]) || {};
      const detail = {
        id: d.id, type: type,
        title: d.title || d.name || '',
        original: d.original_title || d.original_name || '',
        year: (d.release_date || d.first_air_date || '').slice(0, 4),
        rating: d.vote_average ? Number(d.vote_average).toFixed(1) : '',
        overview: overview,
        poster: d.poster_path ? IMG + 'w500' + d.poster_path : '',
        backdrop: d.backdrop_path ? IMG + 'w780' + d.backdrop_path : '',
        genres: (d.genres || []).map(g => g.name),
        language: sl.name || sl.english_name || d.original_language || '',
        countries: (d.production_countries || []).map(c => c.name),
        seasons: d.number_of_seasons || null,
        episodes: d.number_of_episodes || null,
        runtime: type === 'movie' ? (d.runtime || null) : ((d.episode_run_time && d.episode_run_time[0]) || null),
        statusTxt: d.status || ''
      };
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
      return res.status(200).json(detail);
    }

    // ---------- LISTA ----------
    // poster w342 = nitido en PC, sigue siendo razonable en movil
    // Generos TMDB: Soap(telenovela)=10766, Animation=16
    function clasifica(x, type){
      var g = x.genre_ids || [];
      var lang = x.original_language || '';
      // ANIME: género Animación (16) con origen asiático (japonés, coreano, chino)
      // aplica tanto a películas como series (hay películas anime también)
      if (g.indexOf(16) !== -1 && (lang === 'ja' || lang === 'ko' || lang === 'zh')) return 'anime';
      if (type === 'movie') return 'pelicula';
      // NOVELA: género telenovela (Soap 10766), o serie en español/portugués con Drama(18)
      if (g.indexOf(10766) !== -1) return 'novela';
      if ((lang === 'es' || lang === 'pt') && g.indexOf(18) !== -1) return 'novela';
      return 'serie';
    }
    const map = (arr, type, provider, forceCat) => (arr || []).map(x => ({
      id: x.id, type: type, provider: provider,
      cat: forceCat || clasifica(x, type),
      title: x.title || x.name || '',
      year: (x.release_date || x.first_air_date || '').slice(0, 4),
      rating: x.vote_average ? Number(x.vote_average).toFixed(1) : '',
      pop: x.popularity || 0,
      poster: x.poster_path ? IMG + 'w342' + x.poster_path : ''
    }));

    // Busca un titulo por nombre en TMDB y lo devuelve mapeado (poster, año, rating)
    async function searchTitle(name, cat, provider){
      // intenta TV primero (la mayoria de novelas/animes son series)
      const tryType = async (t) => {
        const u = api + 'search/' + t + '?' + authQ + 'language=' + LANG + '&query=' + encodeURIComponent(name);
        const r = await fetch(u, { headers }).then(x => x.ok ? x.json() : { results: [] }).catch(() => ({ results: [] }));
        const hit = (r.results || []).filter(x => x.poster_path)[0];
        return hit ? map([hit], t, provider, cat)[0] : null;
      };
      let item = await tryType('tv');
      if (!item) item = await tryType('movie');
      return item;
    }
    async function fetchCurated(provider, cat){
      const names = (CURATED[provider] && CURATED[provider][cat]) || [];
      const results = await Promise.all(names.map(n => searchTitle(n, cat, provider)));
      return results.filter(Boolean);
    }

    async function fetchProvider(provider) {
      const pid = PROVIDERS[provider];
      const base = '&language=' + LANG + '&watch_region=' + REGION +
                '&with_watch_providers=' + pid + '&sort_by=popularity.desc';
      const G = (url) => fetch(api + url, { headers }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }));
      const [mv1, mv2, tv1, tv2, NOV, ANI] = await Promise.all([
        G('discover/movie?' + authQ + base + '&page=1'),
        G('discover/movie?' + authQ + base + '&page=2'),
        G('discover/tv?'    + authQ + base + '&page=1'),
        G('discover/tv?'    + authQ + base + '&page=2'),
        fetchCurated(provider, 'novela'),   // novelas curadas (nombres reales)
        fetchCurated(provider, 'anime')     // animes curados (nombres reales)
      ]);
      // Populares: solo peliculas y series (excluye lo que ya es novela/anime por clasificacion)
      const M = map([].concat(mv1.results||[], mv2.results||[]), 'movie', provider).filter(it => it.cat==='pelicula');
      const T = map([].concat(tv1.results||[], tv2.results||[]), 'tv', provider).filter(it => it.cat==='serie');
      const out = [];
      for (let i = 0; i < Math.max(M.length, T.length); i++) { if (M[i]) out.push(M[i]); if (T[i]) out.push(T[i]); }
      // Agregar novelas y animes curados (sin duplicar por id dentro de la app)
      const seen = {}; out.forEach(it => seen[it.type+':'+it.id] = 1);
      [].concat(NOV, ANI).forEach(it => { const k = it.type+':'+it.id; if (!seen[k]) { seen[k]=1; out.push(it); } });
      return out.filter(i => i.poster);
    }

    // Si piden una sola app, igual deduplicamos contra las demas para no repetir.
    const provReq = req.query && req.query.provider ? String(req.query.provider).toLowerCase() : null;
    const provs = Object.keys(PROVIDERS);

    const all = await Promise.all(provs.map(fetchProvider));
    const byProviderRaw = {};
    provs.forEach((p, i) => { byProviderRaw[p] = all[i]; });

    // Deduplicar global: cada (type+id) se queda solo en la app de mayor prioridad donde aparezca.
    const owner = {}; // key -> provider
    PRIORITY.forEach(function(p){
      (byProviderRaw[p] || []).forEach(function(it){
        const k = it.type + ':' + it.id;
        if (owner[k] === undefined) owner[k] = p;
      });
    });
    // cubrir cualquier provider fuera de PRIORITY (por si acaso)
    provs.forEach(function(p){
      (byProviderRaw[p] || []).forEach(function(it){
        const k = it.type + ':' + it.id;
        if (owner[k] === undefined) owner[k] = p;
      });
    });

    const byProvider = {};
    provs.forEach(function(p){
      // Novelas y animes curados: SIEMPRE se quedan en su app (no se deduplican entre apps).
      // Peliculas y series populares: si se deduplican (para no repetir el mismo titulo).
      var mine = (byProviderRaw[p] || []).filter(function(it){
        if (it.cat === 'novela' || it.cat === 'anime') return true;
        return owner[it.type + ':' + it.id] === p;
      });
      // Separar por categoria para garantizar cupo de cada una
      var pelis   = mine.filter(function(it){ return it.cat === 'pelicula'; });
      var series  = mine.filter(function(it){ return it.cat === 'serie'; });
      var novelas = mine.filter(function(it){ return it.cat === 'novela'; });
      var animes  = mine.filter(function(it){ return it.cat === 'anime'; });
      // Ordenar cada grupo por popularidad
      [pelis, series, novelas, animes].forEach(function(a){ a.sort(function(x,y){ return (y.pop||0)-(x.pop||0); }); });
      // Tomar buena cantidad de cada uno (asi Novelas y Animes salen llenos)
      byProvider[p] = [].concat(
        pelis.slice(0, 30),
        series.slice(0, 30),
        novelas.slice(0, 40),
        animes.slice(0, 40)
      );
    });

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');

    if (provReq && PROVIDERS[provReq]) {
      return res.status(200).json({ provider: provReq, region: REGION, count: byProvider[provReq].length, items: byProvider[provReq] });
    }
    return res.status(200).json({ region: REGION, byProvider: byProvider });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno: ' + (e && e.message ? e.message : 'desconocido') });
  }
};

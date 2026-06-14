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
// Orden de prioridad cuando un titulo esta en varias apps:
// se queda en la primera de esta lista donde aparezca.
const PRIORITY = ['crunchyroll','disney','hbomax','paramount','netflix','prime'];

const REGION = 'HN';
const LANG   = 'es-MX';
const IMG    = 'https://image.tmdb.org/t/p/';

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
      if (type === 'movie') return 'pelicula';
      // ANIME: animacion + origen asiatico
      if (g.indexOf(16) !== -1 && (lang === 'ja' || lang === 'zh' || lang === 'ko')) return 'anime';
      // NOVELA: genero Soap(10766), o serie en español con Drama(18) (novelas latinas)
      if (g.indexOf(10766) !== -1) return 'novela';
      if (lang === 'es' && g.indexOf(18) !== -1) return 'novela';
      return 'serie';
    }
    const map = (arr, type, provider) => (arr || []).map(x => ({
      id: x.id, type: type, provider: provider,
      cat: clasifica(x, type),
      title: x.title || x.name || '',
      year: (x.release_date || x.first_air_date || '').slice(0, 4),
      rating: x.vote_average ? Number(x.vote_average).toFixed(1) : '',
      pop: x.popularity || 0,
      poster: x.poster_path ? IMG + 'w342' + x.poster_path : ''
    }));

    async function fetchProvider(provider) {
      const pid = PROVIDERS[provider];
      const base = '&language=' + LANG + '&watch_region=' + REGION +
                '&with_watch_providers=' + pid + '&sort_by=popularity.desc';
      // 2 paginas de cada tipo = mas titulos (entran novelas, animes, estrenos)
      const [mv1, mv2, tv1, tv2] = await Promise.all([
        fetch(api + 'discover/movie?' + authQ + base + '&page=1', { headers }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] })),
        fetch(api + 'discover/movie?' + authQ + base + '&page=2', { headers }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] })),
        fetch(api + 'discover/tv?'    + authQ + base + '&page=1', { headers }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] })),
        fetch(api + 'discover/tv?'    + authQ + base + '&page=2', { headers }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
      ]);
      const M = map([].concat(mv1.results||[], mv2.results||[]), 'movie', provider);
      const T = map([].concat(tv1.results||[], tv2.results||[]), 'tv', provider);
      const out = [];
      for (let i = 0; i < Math.max(M.length, T.length); i++) { if (M[i]) out.push(M[i]); if (T[i]) out.push(T[i]); }
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
      byProvider[p] = (byProviderRaw[p] || [])
        .filter(function(it){ return owner[it.type + ':' + it.id] === p; })
        .slice(0, 40);
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

// ============================================================
//  /api/cartelera.js  —  Funcion Serverless de Vercel (CommonJS)
//  VERSION ANTI-CRASH (FUNCTION_INVOCATION_FAILED):
//   - Concurrencia limitada (no dispara 200+ requests de golpe -> no timeout)
//   - Timeout por request (AbortController / https) -> ningun request cuelga la funcion
//   - Fallback de fetch para Node viejo -> sin "fetch is not defined"
//   - SIEMPRE responde JSON (nunca revienta el proceso)
//   - ?debug=1 para diagnostico
// ============================================================
//  LISTA:     /api/cartelera            -> {byProvider:{netflix:[...],...}}
//  UNA app:   /api/cartelera?provider=netflix
//  DETALLE:   /api/cartelera?id=123&type=tv
//  DEBUG:     /api/cartelera?debug=1
// ============================================================

const PROVIDERS = {
  netflix: 8, disney: 337, hbomax: 1899, prime: 119, paramount: 531, crunchyroll: 283
};
const PRIORITY = ['netflix','crunchyroll','disney','hbomax','paramount','prime'];

const REGION = 'MX';
const LANG   = 'es-MX';
const IMG    = 'https://image.tmdb.org/t/p/';

// Concurrencia maxima de busquedas curadas simultaneas (bajala si sigue lento)
const MAX_CONC = 8;
const REQ_TIMEOUT = 4500; // ms por peticion (bajado: evita colgar la funcion)
const HARD_BUDGET = 8000; // ms totales maximos para armar la lista (deja margen bajo el limite de 10s de Hobby)

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
    novela: ['Rebelde','Violetta','Soy Luna','Patito Feo','Chica Vampiro','Cómplices al rescate'],
    anime: ['Doraemon','Bluey','Los Simpson','Phineas y Ferb','Gravity Falls','Star vs las Fuerzas del Mal']
  },
  prime: {
    novela: ['Pasión de gavilanes','Sin senos sí hay paraíso','La Reina del Sur','El Clon','Marimar','María la del Barrio'],
    anime: ['Dragon Ball Z','Dragon Ball','Pokémon','Sailor Moon','Inuyasha','Yu-Gi-Oh']
  },
  paramount: {
    novela: ['Rubí','Teresa','La Madrastra','Triunfo del Amor','Soy tu dueña','Abismo de pasión'],
    anime: ['Bob Esponja','Avatar: La leyenda de Aang','Las Tortugas Ninja','Los Padrinos Mágicos']
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

// Fetch universal (fetch nativo en Node 18+, o https en Node viejo)
function makeFetch(){
  if (typeof fetch === 'function') return fetch;
  const https = require('https');
  return function(url, opts){
    opts = opts || {};
    return new Promise(function(resolve, reject){
      var rq = https.request(url, { method: opts.method || 'GET', headers: opts.headers || {} }, function(resp){
        var data = '';
        resp.on('data', function(c){ data += c; });
        resp.on('end', function(){
          resolve({
            ok: resp.statusCode >= 200 && resp.statusCode < 300,
            status: resp.statusCode,
            json: function(){ return Promise.resolve().then(function(){ return JSON.parse(data || '{}'); }); },
            text: function(){ return Promise.resolve(data); }
          });
        });
      });
      rq.setTimeout(8000, function(){ try { rq.destroy(new Error('timeout')); } catch (e) {} });
      rq.on('error', reject);
      rq.end();
    });
  };
}

// Ejecuta tareas con concurrencia limitada (evita abrir 200 conexiones a la vez)
// deadline (timestamp ms, opcional): deja de lanzar tareas nuevas si ya se paso el presupuesto de tiempo
function pool(items, limit, worker, deadline){
  return new Promise(function(resolve){
    var n = items.length;
    var ret = new Array(n);
    if (n === 0) return resolve(ret);
    var idx = 0, done = 0;
    var lim = Math.max(1, Math.min(limit, n));
    function launch(){
      if (idx >= n) return;
      if (deadline && Date.now() > deadline) {
        // presupuesto agotado: no lanzar mas, dar por terminadas las que faltan (null)
        while (idx < n) { ret[idx] = null; idx++; done++; }
        if (done === n) resolve(ret);
        return;
      }
      var i = idx++;
      Promise.resolve().then(function(){ return worker(items[i], i); })
        .then(function(v){ ret[i] = v; }, function(){ ret[i] = null; })
        .then(function(){ done++; if (done === n) resolve(ret); else launch(); });
    }
    for (var k = 0; k < lim; k++) launch();
  });
}

module.exports = async (req, res) => {
  // Red de seguridad: si por lo que sea la logica de abajo se pasa del limite real de Vercel,
  // respondemos algo valido ANTES de que la plataforma mate la funcion con FUNCTION_INVOCATION_FAILED.
  const safetyTimer = setTimeout(function(){
    if (!res.headersSent) {
      try { res.status(200).json({ region: REGION, total: 0, byProvider: {}, warning: 'timeout_parcial: la carga tardo demasiado, intenta de nuevo' }); } catch (e) {}
    }
  }, 9200);

  try {
    const key = process.env.TMDB_API_KEY;
    if (!key || !String(key).trim()) {
      clearTimeout(safetyTimer);
      return res.status(500).json({ error: 'Falta TMDB_API_KEY. Agrégala en Vercel (Settings > Environment Variables, Production) y haz Redeploy.' });
    }
    const { headers, authQ } = buildAuth(key);
    const api = 'https://api.themoviedb.org/3/';
    const doFetch = makeFetch();

    // fetch con timeout por peticion (AbortController si hay fetch nativo)
    function timedFetch(url, opts, ms){
      ms = ms || REQ_TIMEOUT;
      opts = opts || {};
      if (typeof AbortController === 'function' && typeof fetch === 'function') {
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ try { ctrl.abort(); } catch (e) {} }, ms);
        var o = {}; for (var k in opts) o[k] = opts[k]; o.signal = ctrl.signal;
        return Promise.resolve().then(function(){ return doFetch(url, o); })
          .then(function(r){ clearTimeout(timer); return r; }, function(e){ clearTimeout(timer); throw e; });
      }
      return Promise.resolve().then(function(){ return doFetch(url, opts); });
    }
    const getJSON = (url) => timedFetch(url, { headers }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }));

    // ---------- VALIDACION RAPIDA DE LA CLAVE (solo en modo debug, para no perder tiempo en cada carga) ----------
    if (req.query && req.query.debug) {
      const test = await timedFetch(api + 'configuration?' + authQ, { headers }, 6000)
        .then(function(r){ return { ok: r.ok, status: r.status }; })
        .catch(function(e){ return { ok: false, status: 0, err: (e && e.message) || 'red' }; });
      clearTimeout(safetyTimer);
      return res.status(200).json({
        ok: test.ok, tmdbStatus: test.status, keyPresent: true, keyLen: String(key).length,
        keyType: (String(key).length > 50 && String(key).indexOf('.') !== -1) ? 'v4(token)' : 'v3(api_key)',
        fetchNativo: (typeof fetch === 'function'), nodeVersion: process.version,
        hint: test.status === 401 ? 'CLAVE INVALIDA (401)' : (test.ok ? 'TODO OK' : 'No se pudo contactar TMDB: ' + (test.err || ''))
      });
    }

    // ---------- MODO DETALLE ----------
    const id = req.query && req.query.id;
    if (id) {
      const type = (req.query.type === 'tv') ? 'tv' : 'movie';
      const u = api + type + '/' + encodeURIComponent(id) + '?' + authQ + 'language=';
      const d = await timedFetch(u + LANG, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      let overview = d.overview || '';
      if (!overview) {
        const de = await timedFetch(u + 'en-US', { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
        overview = de.overview || '';
      }
      const sl = (d.spoken_languages && d.spoken_languages[0]) || {};
      const detail = {
        id: d.id, type: type, title: d.title || d.name || '',
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
      clearTimeout(safetyTimer);
      return res.status(200).json(detail);
    }

    // ---------- LISTA ----------
    function clasifica(x, type){
      var g = x.genre_ids || [];
      var lang = x.original_language || '';
      if (g.indexOf(16) !== -1 && (lang === 'ja' || lang === 'ko' || lang === 'zh')) return 'anime';
      if (type === 'movie') return 'pelicula';
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

    async function searchTitle(name, cat, provider){
      const tryType = async (t) => {
        const u = api + 'search/' + t + '?' + authQ + 'language=' + LANG + '&query=' + encodeURIComponent(name);
        const r = await getJSON(u);
        const hit = (r.results || []).filter(x => x.poster_path)[0];
        return hit ? map([hit], t, provider, cat)[0] : null;
      };
      let item = await tryType('tv');
      if (!item) item = await tryType('movie');
      return item;
    }

    // presupuesto de tiempo total para esta ejecucion (evita que Vercel mate la funcion)
    const deadline = Date.now() + HARD_BUDGET;

    // 1) DISCOVER (peliculas/series populares) por provider — pocas llamadas, en paralelo
    const provReq = req.query && req.query.provider ? String(req.query.provider).toLowerCase() : null;
    const provs = (provReq && PROVIDERS[provReq]) ? [provReq] : Object.keys(PROVIDERS);
    async function fetchDiscover(provider){
      const pid = PROVIDERS[provider];
      const base = '&language=' + LANG + '&watch_region=' + REGION + '&with_watch_providers=' + pid + '&sort_by=popularity.desc';
      const [mv1, mv2, tv1, tv2] = await Promise.all([
        getJSON(api + 'discover/movie?' + authQ + base + '&page=1'),
        getJSON(api + 'discover/movie?' + authQ + base + '&page=2'),
        getJSON(api + 'discover/tv?' + authQ + base + '&page=1'),
        getJSON(api + 'discover/tv?' + authQ + base + '&page=2')
      ]);
      const M = map([].concat(mv1.results || [], mv2.results || []), 'movie', provider).filter(it => it.cat === 'pelicula');
      const T = map([].concat(tv1.results || [], tv2.results || []), 'tv', provider).filter(it => it.cat === 'serie');
      const out = [];
      for (let i = 0; i < Math.max(M.length, T.length); i++) { if (M[i]) out.push(M[i]); if (T[i]) out.push(T[i]); }
      return out.filter(i => i.poster);
    }
    const discoverAll = await Promise.all(provs.map(fetchDiscover));

    // 2) CURADOS (novelas/animes) — solo de las plataformas en juego, con presupuesto de tiempo
    const curatedTasks = [];
    provs.forEach(function(p){
      ['novela','anime'].forEach(function(cat){
        ((CURATED[p] && CURATED[p][cat]) || []).forEach(function(name){ curatedTasks.push({ p: p, cat: cat, name: name }); });
      });
    });
    const curatedResults = await pool(curatedTasks, MAX_CONC, function(t){ return searchTitle(t.name, t.cat, t.p); }, deadline);

    // 3) Armar byProviderRaw = discover + curados (sin duplicar dentro de la app)
    const byProviderRaw = {};
    provs.forEach((p, i) => { byProviderRaw[p] = (discoverAll[i] || []).slice(); });
    const curByProv = {}; provs.forEach(p => { curByProv[p] = []; });
    curatedResults.forEach(function(it, i){ if (it && curByProv[curatedTasks[i].p]) curByProv[curatedTasks[i].p].push(it); });
    provs.forEach(function(p){
      const seen = {}; byProviderRaw[p].forEach(it => { seen[it.type + ':' + it.id] = 1; });
      curByProv[p].forEach(function(it){ const k = it.type + ':' + it.id; if (!seen[k]) { seen[k] = 1; byProviderRaw[p].push(it); } });
    });

    // 4) Dedupe global por prioridad (solo relevante si estamos procesando varias plataformas a la vez)
    const owner = {};
    if (provs.length > 1) {
      PRIORITY.forEach(function(p){ (byProviderRaw[p] || []).forEach(function(it){ const k = it.type + ':' + it.id; if (owner[k] === undefined) owner[k] = p; }); });
      provs.forEach(function(p){ (byProviderRaw[p] || []).forEach(function(it){ const k = it.type + ':' + it.id; if (owner[k] === undefined) owner[k] = p; }); });
    }

    const byProvider = {};
    provs.forEach(function(p){
      var mine = (byProviderRaw[p] || []).filter(function(it){
        if (provs.length === 1) return true;
        if (it.cat === 'novela' || it.cat === 'anime') return true;
        return owner[it.type + ':' + it.id] === p;
      });
      var pelis   = mine.filter(function(it){ return it.cat === 'pelicula'; });
      var series  = mine.filter(function(it){ return it.cat === 'serie'; });
      var novelas = mine.filter(function(it){ return it.cat === 'novela'; });
      var animes  = mine.filter(function(it){ return it.cat === 'anime'; });
      [pelis, series, novelas, animes].forEach(function(a){ a.sort(function(x, y){ return (y.pop || 0) - (x.pop || 0); }); });
      byProvider[p] = [].concat(pelis.slice(0, 30), series.slice(0, 30), novelas.slice(0, 40), animes.slice(0, 40));
    });

    var totalItems = 0; provs.forEach(function(p){ totalItems += (byProvider[p] || []).length; });

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
    if (provReq && PROVIDERS[provReq]) {
      clearTimeout(safetyTimer);
      return res.status(200).json({ provider: provReq, region: REGION, count: byProvider[provReq].length, items: byProvider[provReq] });
    }
    clearTimeout(safetyTimer);
    return res.status(200).json({ region: REGION, total: totalItems, byProvider: byProvider });
  } catch (e) {
    clearTimeout(safetyTimer);
    return res.status(500).json({ error: 'Error interno: ' + (e && e.message ? e.message : 'desconocido') });
  }
};

// Da mas tiempo a la funcion (evita el timeout que provoca el crash). Requiere plan que lo soporte;
// en Hobby el limite real sigue siendo 10s aunque se declare mayor -> ver vercel.json abajo.
module.exports.config = { maxDuration: 60 };

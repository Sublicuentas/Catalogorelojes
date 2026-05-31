// ============================================================
//  /api/cartelera.js   —  Funcion Serverless de Vercel (CommonJS)
// ============================================================
//  - Modo LISTA:    /api/cartelera?provider=netflix
//  - Modo DETALLE:  /api/cartelera?id=123&type=tv  (o type=movie)
//  Region = HN (Honduras) para que cada titulo salga en la
//  plataforma correcta de tu mercado.
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

const REGION = 'HN';   // Honduras. Prueba 'MX' si quieres mas titulos.
const LANG   = 'es-MX';
const IMG    = 'https://image.tmdb.org/t/p/';

module.exports = async (req, res) => {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) return res.status(500).json({ error: 'Falta TMDB_API_KEY (haz Redeploy)' });

    const isV4 = key.length > 50 && key.indexOf('.') !== -1;
    const headers = isV4 ? { Authorization: 'Bearer ' + key } : {};
    const authQ = isV4 ? '' : ('api_key=' + key + '&');
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
        poster: d.poster_path ? IMG + 'w342' + d.poster_path : '',
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

    // ---------- MODO LISTA ----------
    const provider = String((req.query && req.query.provider) || 'netflix').toLowerCase();
    const pid = PROVIDERS[provider];
    if (!pid) return res.status(400).json({ error: 'provider invalido: ' + provider });

    const q = authQ + 'language=' + LANG + '&watch_region=' + REGION +
              '&with_watch_providers=' + pid + '&sort_by=popularity.desc&page=1';
    const [mvR, tvR] = await Promise.all([
      fetch(api + 'discover/movie?' + q, { headers }),
      fetch(api + 'discover/tv?'    + q, { headers })
    ]);
    if (!mvR.ok && !tvR.ok) {
      const t = await mvR.text().catch(() => '');
      return res.status(502).json({ error: 'TMDB ' + mvR.status + ': ' + t.slice(0, 140) });
    }
    const mv = await mvR.json().catch(() => ({ results: [] }));
    const tv = await tvR.json().catch(() => ({ results: [] }));
    const map = (arr, type) => (arr || []).map(x => ({
      id: x.id, type: type,
      title: x.title || x.name || '',
      year: (x.release_date || x.first_air_date || '').slice(0, 4),
      rating: x.vote_average ? Number(x.vote_average).toFixed(1) : '',
      poster: x.poster_path ? IMG + 'w342' + x.poster_path : ''
    }));
    const M = map(mv.results, 'movie');
    const T = map(tv.results, 'tv');
    const out = [];
    for (let i = 0; i < Math.max(M.length, T.length); i++) {
      if (M[i]) out.push(M[i]);
      if (T[i]) out.push(T[i]);
    }
    const items = out.filter(i => i.poster).slice(0, 18);
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json({ provider: provider, region: REGION, count: items.length, items: items });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno: ' + (e && e.message ? e.message : 'desconocido') });
  }
};

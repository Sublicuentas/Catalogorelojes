// ============================================================
//  /api/cartelera.js   —  Funcion Serverless de Vercel (Node)
// ============================================================
//  ACTIVACION:
//  1) Cuenta gratis en https://www.themoviedb.org/
//     Settings -> API -> copia tu "API Key (v3 auth)" (o el Read Access Token v4).
//  2) Vercel -> Settings -> Environment Variables -> TMDB_API_KEY = (tu clave)
//  3) IMPORTANTE: despues de agregar la variable, haz un REDEPLOY
//     (Deployments -> ... -> Redeploy). Subir este archivo ya dispara un deploy nuevo.
//  4) Este archivo va en la carpeta /api del repo: api/cartelera.js
//
//  Acepta tanto la API Key v3 (corta) como el token v4 (largo, con puntos).
// ============================================================

const PROVIDERS = {
  netflix:     8,
  disney:      337,   // Disney+
  hbomax:      1899,  // Max. Alternativos: 384, 615
  prime:       119,   // Amazon Prime Video. Alternativo: 9
  paramount:   531,   // Paramount+
  crunchyroll: 283
};

const REGION = 'US';      // prueba 'MX', 'ES' o 'HN' si quieres
const LANG   = 'es-MX';

export default async function handler(req, res) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) return res.status(500).json({ error: 'Falta TMDB_API_KEY en Vercel (recuerda Redeploy)' });

    const provider = String((req.query && req.query.provider) || 'netflix').toLowerCase();
    const pid = PROVIDERS[provider];
    if (!pid) return res.status(400).json({ error: 'provider invalido' });

    // v4 token = largo y con puntos -> va por header Bearer; v3 = por query api_key
    const isV4 = key.length > 50 && key.indexOf('.') !== -1;
    const headers = isV4 ? { Authorization: 'Bearer ' + key } : {};
    const authQ = isV4 ? '' : ('api_key=' + key + '&');

    const base = 'https://api.themoviedb.org/3/discover/';
    const q = authQ + 'language=' + LANG + '&watch_region=' + REGION +
              '&with_watch_providers=' + pid + '&sort_by=popularity.desc&page=1';

    const [mvR, tvR] = await Promise.all([
      fetch(base + 'movie?' + q, { headers }),
      fetch(base + 'tv?'    + q, { headers })
    ]);

    if (!mvR.ok && !tvR.ok) {
      const t = await mvR.text().catch(() => '');
      return res.status(502).json({ error: 'TMDB respondio ' + mvR.status + ' ' + t.slice(0, 120) });
    }

    const mv = await mvR.json().catch(() => ({ results: [] }));
    const tv = await tvR.json().catch(() => ({ results: [] }));

    const map = (arr, type) => (arr || []).map(x => ({
      title:  x.title || x.name || '',
      type,
      year:  (x.release_date || x.first_air_date || '').slice(0, 4),
      rating: x.vote_average ? Number(x.vote_average).toFixed(1) : '',
      poster: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : ''
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
    return res.status(200).json({ provider, region: REGION, count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: 'Error interno: ' + (e && e.message ? e.message : 'desconocido') });
  }
}

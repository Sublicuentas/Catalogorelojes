// ============================================================
//  /api/cartelera.js   —  Funcion Serverless de Vercel (Node)
// ============================================================
//  PASOS PARA ACTIVARLA:
//  1) Crea una cuenta GRATIS en https://www.themoviedb.org/
//     -> Settings (Ajustes) -> API -> "Create" -> elige "Developer"
//     -> copia tu "API Key (v3 auth)".
//  2) En Vercel: tu proyecto -> Settings -> Environment Variables
//     -> agrega:   Name = TMDB_API_KEY    Value = (tu clave)
//     -> guarda y haz "Redeploy".
//  3) Sube ESTE archivo dentro de la carpeta  /api  de tu repo
//     (es decir, debe quedar como  api/cartelera.js).
//     Vercel lo publica solo como  https://tudominio/api/cartelera
//
//  Listo: la pestana Cartelera empezara a mostrar las caratulas.
//  Se actualiza solo (cache de ~12h) porque TMDB actualiza su data
//  y el orden por popularidad cambia a diario.
// ============================================================

// IDs de proveedor en TMDB. Si una app no muestra nada, prueba los
// IDs alternativos que dejo en el comentario.
const PROVIDERS = {
  netflix:     8,
  disney:      337,   // Disney+
  hbomax:      1899,  // Max (antes HBO Max). Alternativos: 384, 615
  prime:       119,   // Amazon Prime Video. Alternativo: 9
  paramount:   531,   // Paramount+
  crunchyroll: 283
};

// Region de disponibilidad. 'US' trae mas titulos; tambien puedes
// probar 'MX', 'ES' o 'HN' (Honduras suele traer menos data).
const REGION = 'US';
const LANG   = 'es-MX';   // idioma de titulos/descripciones

export default async function handler(req, res) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) return res.status(500).json({ error: 'Falta la variable TMDB_API_KEY en Vercel' });

    const provider = String(req.query.provider || 'netflix').toLowerCase();
    const pid = PROVIDERS[provider];
    if (!pid) return res.status(400).json({ error: 'provider invalido' });

    const base = 'https://api.themoviedb.org/3/discover/';
    const q = `api_key=${key}&language=${LANG}&watch_region=${REGION}` +
              `&with_watch_providers=${pid}&sort_by=popularity.desc&page=1`;

    const [mv, tv] = await Promise.all([
      fetch(base + 'movie?' + q).then(r => r.json()),
      fetch(base + 'tv?'    + q).then(r => r.json())
    ]);

    const map = (arr, type) => (arr || []).map(x => ({
      title:  x.title || x.name || '',
      type,
      year:  (x.release_date || x.first_air_date || '').slice(0, 4),
      rating: x.vote_average ? Number(x.vote_average).toFixed(1) : '',
      poster: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : ''
    }));

    // Intercala peliculas y series (ambas por popularidad)
    const M = map(mv.results, 'movie');
    const T = map(tv.results, 'tv');
    const out = [];
    for (let i = 0; i < Math.max(M.length, T.length); i++) {
      if (M[i]) out.push(M[i]);
      if (T[i]) out.push(T[i]);
    }
    const items = out.filter(i => i.poster).slice(0, 18);

    // Cache en el edge: se refresca solo cada ~12h
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json({ provider, region: REGION, items });
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo consultar TMDB' });
  }
}

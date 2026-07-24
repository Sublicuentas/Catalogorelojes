// ============================================================
//  /api/ratings.js — Puntuaciones reales de Rotten Tomatoes
//  Resuelve el IMDb ID desde TMDB y consulta la fuente "Rotten
//  Tomatoes" que expone OMDb. No inventa ni sustituye valores.
//
//  Requiere en Vercel:
//    TMDB_API_KEY
//    OMDB_API_KEY
//
//  GET /api/ratings?ids=movie:123,tv:456
// ============================================================

const MAX_IDS = 12;
const TIMEOUT_MS = 5000;
const memoryCache = new Map();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const tmdbKey = String(process.env.TMDB_API_KEY || "").trim();
  const omdbKey = String(process.env.OMDB_API_KEY || "").trim();
  if (!tmdbKey || !omdbKey) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      configured: false,
      ratings: {},
      missing: [
        !tmdbKey ? "TMDB_API_KEY" : null,
        !omdbKey ? "OMDB_API_KEY" : null,
      ].filter(Boolean),
    });
  }

  const raw = Array.isArray(req.query.ids) ? req.query.ids.join(",") : String(req.query.ids || "");
  const ids = [...new Set(
    raw.split(",")
      .map((item) => item.trim())
      .filter((item) => /^(movie|tv):\d+$/.test(item))
  )].slice(0, MAX_IDS);

  if (!ids.length) {
    return res.status(200).json({ configured: true, ratings: {} });
  }

  const ratings = {};
  await Promise.all(ids.map(async (key) => {
    if (memoryCache.has(key)) {
      ratings[key] = memoryCache.get(key);
      return;
    }
    const [type, id] = key.split(":");
    const value = await getRottenRating(type, id, tmdbKey, omdbKey);
    memoryCache.set(key, value);
    ratings[key] = value;
  }));

  res.setHeader("Cache-Control", "s-maxage=604800, stale-while-revalidate=86400");
  return res.status(200).json({ configured: true, source: "OMDb / Rotten Tomatoes", ratings });
}

async function getRottenRating(type, id, tmdbKey, omdbKey) {
  try {
    const auth = tmdbAuth(tmdbKey);
    const tmdbUrl = `https://api.themoviedb.org/3/${type}/${id}/external_ids${auth.query}`;
    const external = await fetchJSON(tmdbUrl, { headers: auth.headers });
    if (!external || !external.imdb_id) return null;

    const omdbUrl = `https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(external.imdb_id)}&plot=short&r=json`;
    const movie = await fetchJSON(omdbUrl);
    const item = movie && Array.isArray(movie.Ratings)
      ? movie.Ratings.find((rating) => rating.Source === "Rotten Tomatoes")
      : null;
    return item && /^\d{1,3}%$/.test(item.Value) ? item.Value : null;
  } catch (e) {
    return null;
  }
}

function tmdbAuth(key) {
  const isV4 = key.length > 50 && key.includes(".");
  return {
    headers: isV4 ? { Authorization: `Bearer ${key}` } : {},
    query: isV4 ? "" : `?api_key=${encodeURIComponent(key)}`,
  };
}

async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

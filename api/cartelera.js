// ============================================================
// /api/cartelera.js — Cartelera actual por plataforma
//
// La selección combina:
//   1. Tendencias semanales de TMDB.
//   2. Películas estrenadas durante los últimos 24 meses.
//   3. Series nuevas o con episodios/temporadas recientes.
//   4. Disponibilidad por suscripción en cada plataforma.
//
// Honduras es la región principal. México se usa únicamente si
// TMDB no devuelve ningún título para una plataforma en Honduras.
// ============================================================

import https from 'https';

const PROVIDERS = {
  netflix: 8,
  disney: 337,
  hbomax: 1899,
  prime: 119,
  paramount: 531,
  crunchyroll: 283
};

const REGION = String(process.env.TMDB_WATCH_REGION || 'HN').toUpperCase();
const FALLBACK_REGION = String(process.env.TMDB_FALLBACK_REGION || 'MX').toUpperCase();
const LANG = 'es-MX';
const IMG = 'https://image.tmdb.org/t/p/';
const REQ_TIMEOUT = 4500;
const CACHE_SECONDS = 3600;
const STALE_SECONDS = 3600;
const SELECTION_VERSION = 'trends-2026-07-v2';

function buildAuth(key) {
  const isV4 = key.length > 50 && key.indexOf('.') !== -1;
  return {
    isV4,
    headers: isV4 ? { Authorization: 'Bearer ' + key } : {}
  };
}

function makeFetch() {
  if (typeof fetch === 'function') return fetch;

  return function fallbackFetch(url, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      const request = https.request(
        url,
        { method: opts.method || 'GET', headers: opts.headers || {} },
        function (response) {
          let data = '';
          response.on('data', function (chunk) { data += chunk; });
          response.on('end', function () {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode,
              json: function () {
                return Promise.resolve().then(function () {
                  return JSON.parse(data || '{}');
                });
              }
            });
          });
        }
      );

      request.setTimeout(REQ_TIMEOUT, function () {
        try { request.destroy(new Error('timeout')); } catch (error) {}
      });
      request.on('error', reject);
      request.end();
    });
  };
}

function isoOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mediaYear(item) {
  return String(item.release_date || item.first_air_date || '').slice(0, 4);
}

function mediaCategory(item, type, provider) {
  const genres = item.genre_ids || [];
  const language = item.original_language || '';

  if (
    genres.indexOf(16) !== -1 &&
    (language === 'ja' || language === 'ko' || language === 'zh')
  ) {
    return 'anime';
  }

  if (type === 'movie') return 'pelicula';

  if (provider === 'netflix') {
    if (genres.indexOf(10766) !== -1) return 'novela';
    if (
      (language === 'es' || language === 'pt') &&
      genres.indexOf(18) !== -1
    ) {
      return 'novela';
    }
  }

  return 'serie';
}

function resultCount(bundle) {
  return [
    bundle.movieRecent,
    bundle.moviePopular,
    bundle.tvNew,
    bundle.tvCurrent
  ].reduce(function (total, response) {
    return total + (((response || {}).results || []).length);
  }, 0);
}

function rankMap(results) {
  const map = new Map();
  (results || []).forEach(function (item, index) {
    if (item && item.id) map.set(String(item.id), index + 1);
  });
  return map;
}

function sourceWeight(source) {
  if (source === 'movie_recent') return 36000;
  if (source === 'tv_new') return 36000;
  if (source === 'tv_current') return 26000;
  if (source === 'movie_trending') return 18000;
  return 0;
}

function itemReason(item, source, trendRank, currentYear) {
  const year = Number(mediaYear(item)) || 0;
  const isRecent = year >= currentYear - 2;

  if (trendRank) {
    if (source === 'tv_current' && !isRecent) {
      return {
        reason: 'Tendencia semanal',
        subtitle: 'Tendencia semanal · Temporada actual'
      };
    }
    return {
      reason: 'Tendencia semanal',
      subtitle: 'Tendencia semanal' + (year ? ' · ' + year : '')
    };
  }

  if (source === 'movie_recent') {
    return {
      reason: 'Estreno reciente',
      subtitle: 'Estreno reciente' + (year ? ' · ' + year : '')
    };
  }

  if (source === 'tv_new') {
    return {
      reason: 'Serie reciente',
      subtitle: 'Serie reciente' + (year ? ' · ' + year : '')
    };
  }

  return {
    reason: 'Temporada actual',
    subtitle: 'Temporada actual' + (isRecent && year ? ' · ' + year : '')
  };
}

function buildProviderItems(provider, bundle, movieRanks, tvRanks) {
  const currentYear = new Date().getUTCFullYear();
  const merged = new Map();

  function add(raw, type, source) {
    if (!raw || !raw.id || !raw.poster_path) return;

    const trendRank = type === 'movie'
      ? (movieRanks.get(String(raw.id)) || 0)
      : (tvRanks.get(String(raw.id)) || 0);

    const key = type + ':' + raw.id;
    const previous = merged.get(key);
    const selectedSource = previous && sourceWeight(previous.source) > sourceWeight(source)
      ? previous.source
      : source;
    const selectedRank = previous && previous.trendRank
      ? Math.min(previous.trendRank, trendRank || previous.trendRank)
      : trendRank;
    const labels = itemReason(raw, selectedSource, selectedRank, currentYear);
    const popularity = Number(raw.popularity) || 0;
    const trendBoost = selectedRank ? Math.max(0, 110000 - selectedRank * 2500) : 0;

    merged.set(key, {
      id: raw.id,
      type,
      provider,
      cat: mediaCategory(raw, type, provider),
      title: raw.title || raw.name || '',
      year: mediaYear(raw),
      rating: raw.vote_average ? Number(raw.vote_average).toFixed(1) : '',
      pop: popularity,
      poster: IMG + 'w342' + raw.poster_path,
      reason: labels.reason,
      subtitle: labels.subtitle,
      trendRank: selectedRank || null,
      source: selectedSource,
      region: bundle.region,
      _score: trendBoost + sourceWeight(selectedSource) + Math.min(popularity, 1500)
    });
  }

  const movieRecent = ((bundle.movieRecent || {}).results || []);
  const moviePopular = ((bundle.moviePopular || {}).results || []);
  const tvNew = ((bundle.tvNew || {}).results || []);
  const tvCurrent = ((bundle.tvCurrent || {}).results || []);

  movieRecent.forEach(function (item) {
    add(item, 'movie', 'movie_recent');
  });

  // Una película antigua solo entra desde la búsqueda amplia si está
  // realmente dentro de la tendencia semanal global de TMDB.
  moviePopular.forEach(function (item) {
    if (movieRanks.has(String(item.id))) add(item, 'movie', 'movie_trending');
  });

  tvNew.forEach(function (item) {
    add(item, 'tv', 'tv_new');
  });

  // Incluye series veteranas únicamente cuando tienen episodios o
  // temporada activa dentro de la ventana reciente.
  tvCurrent.forEach(function (item) {
    add(item, 'tv', 'tv_current');
  });

  const all = Array.from(merged.values()).sort(function (a, b) {
    if (b._score !== a._score) return b._score - a._score;
    return (b.pop || 0) - (a.pop || 0);
  });

  const categoryLimits = {
    pelicula: 24,
    serie: 24,
    novela: 16,
    anime: 24
  };
  const categoryCounts = {
    pelicula: 0,
    serie: 0,
    novela: 0,
    anime: 0
  };
  let legacyCurrentSeries = 0;

  return all.filter(function (item) {
    const year = Number(item.year) || 0;
    const isLegacyCurrentSeries =
      item.type === 'tv' &&
      item.source === 'tv_current' &&
      !item.trendRank &&
      year > 0 &&
      year < currentYear - 2;

    // Evita que franquicias veteranas todavía activas ocupen casi toda la
    // primera pantalla. Conservamos unas pocas como recomendación vigente.
    if (isLegacyCurrentSeries) {
      if (legacyCurrentSeries >= 4) return false;
      legacyCurrentSeries += 1;
    }

    const category = item.cat || 'serie';
    const limit = categoryLimits[category] || 24;
    if (categoryCounts[category] >= limit) return false;
    categoryCounts[category] += 1;
    delete item._score;
    return true;
  }).slice(0, 64);
}

export default async function carteleraHandler(req, res) {
  const safetyTimer = setTimeout(function () {
    if (!res.headersSent) {
      try {
        res.status(200).json({
          region: REGION,
          total: 0,
          byProvider: {},
          warning: 'timeout_parcial'
        });
      } catch (error) {}
    }
  }, 9200);

  function reply(status, payload) {
    clearTimeout(safetyTimer);
    if (!res.headersSent) return res.status(status).json(payload);
    return undefined;
  }

  try {
    const key = String(process.env.TMDB_API_KEY || '').trim();
    if (!key) {
      return reply(500, {
        error: 'Falta TMDB_API_KEY. Agrégala en Vercel y vuelve a desplegar.'
      });
    }

    const auth = buildAuth(key);
    const apiRoot = 'https://api.themoviedb.org/3/';
    const doFetch = makeFetch();

    function apiUrl(path, params) {
      const query = new URLSearchParams(params || {});
      if (!auth.isV4) query.set('api_key', key);
      return apiRoot + path + '?' + query.toString();
    }

    function timedFetch(url, opts, ms) {
      opts = opts || {};
      ms = ms || REQ_TIMEOUT;

      if (typeof AbortController === 'function' && typeof fetch === 'function') {
        const controller = new AbortController();
        const timer = setTimeout(function () {
          try { controller.abort(); } catch (error) {}
        }, ms);
        const requestOptions = Object.assign({}, opts, { signal: controller.signal });
        return Promise.resolve(doFetch(url, requestOptions)).then(
          function (response) {
            clearTimeout(timer);
            return response;
          },
          function (error) {
            clearTimeout(timer);
            throw error;
          }
        );
      }

      return Promise.resolve(doFetch(url, opts));
    }

    function getJSON(path, params) {
      return timedFetch(apiUrl(path, params), { headers: auth.headers })
        .then(function (response) {
          return response.ok ? response.json() : { results: [] };
        })
        .catch(function () {
          return { results: [] };
        });
    }

    if (req.query && req.query.debug) {
      const test = await timedFetch(
        apiUrl('configuration', {}),
        { headers: auth.headers },
        6000
      ).then(
        function (response) {
          return { ok: response.ok, status: response.status };
        },
        function (error) {
          return { ok: false, status: 0, error: error && error.message };
        }
      );

      return reply(200, {
        ok: test.ok,
        tmdbStatus: test.status,
        keyPresent: true,
        keyType: auth.isV4 ? 'v4(token)' : 'v3(api_key)',
        region: REGION,
        fallbackRegion: FALLBACK_REGION,
        selectionVersion: SELECTION_VERSION,
        hint: test.status === 401
          ? 'CLAVE INVALIDA (401)'
          : (test.ok ? 'TODO OK' : 'No se pudo contactar TMDB')
      });
    }

    const detailId = req.query && req.query.id;
    if (detailId) {
      const type = req.query.type === 'tv' ? 'tv' : 'movie';
      const detail = await getJSON(type + '/' + encodeURIComponent(detailId), {
        language: LANG
      });
      let overview = detail.overview || '';

      if (!overview) {
        const englishDetail = await getJSON(type + '/' + encodeURIComponent(detailId), {
          language: 'en-US'
        });
        overview = englishDetail.overview || '';
      }

      const spokenLanguage = (detail.spoken_languages && detail.spoken_languages[0]) || {};
      res.setHeader(
        'Cache-Control',
        's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=' + STALE_SECONDS
      );

      return reply(200, {
        id: detail.id,
        type,
        title: detail.title || detail.name || '',
        original: detail.original_title || detail.original_name || '',
        year: (detail.release_date || detail.first_air_date || '').slice(0, 4),
        rating: detail.vote_average ? Number(detail.vote_average).toFixed(1) : '',
        overview,
        poster: detail.poster_path ? IMG + 'w500' + detail.poster_path : '',
        backdrop: detail.backdrop_path ? IMG + 'w780' + detail.backdrop_path : '',
        genres: (detail.genres || []).map(function (genre) { return genre.name; }),
        language: spokenLanguage.name || spokenLanguage.english_name || detail.original_language || '',
        countries: (detail.production_countries || []).map(function (country) { return country.name; }),
        seasons: detail.number_of_seasons || null,
        episodes: detail.number_of_episodes || null,
        runtime: type === 'movie'
          ? (detail.runtime || null)
          : ((detail.episode_run_time && detail.episode_run_time[0]) || null),
        statusTxt: detail.status || ''
      });
    }

    const providerQuery = req.query && req.query.provider
      ? String(req.query.provider).toLowerCase()
      : null;
    const providers = providerQuery && PROVIDERS[providerQuery]
      ? [providerQuery]
      : Object.keys(PROVIDERS);

    const movieStart = isoOffset(-730);
    const tvStart = isoOffset(-730);
    const currentSeasonStart = isoOffset(-180);
    const today = isoOffset(0);
    const currentSeasonEnd = isoOffset(45);

    function discoverParams(provider, region, extra) {
      return Object.assign({
        language: LANG,
        watch_region: region,
        with_watch_providers: String(PROVIDERS[provider]),
        with_watch_monetization_types: 'flatrate',
        include_adult: 'false',
        sort_by: 'popularity.desc',
        page: '1'
      }, extra || {});
    }

    async function fetchProviderBundle(provider, region) {
      const responses = await Promise.all([
        getJSON('discover/movie', discoverParams(provider, region, {
          'primary_release_date.gte': movieStart,
          'primary_release_date.lte': today,
          'vote_count.gte': '20'
        })),
        getJSON('discover/movie', discoverParams(provider, region, {
          'vote_count.gte': '50'
        })),
        getJSON('discover/tv', discoverParams(provider, region, {
          'first_air_date.gte': tvStart,
          'first_air_date.lte': today,
          include_null_first_air_dates: 'false',
          'vote_count.gte': '10'
        })),
        getJSON('discover/tv', discoverParams(provider, region, {
          'air_date.gte': currentSeasonStart,
          'air_date.lte': currentSeasonEnd,
          include_null_first_air_dates: 'false',
          'vote_count.gte': '10'
        }))
      ]);

      return {
        provider,
        region,
        movieRecent: responses[0],
        moviePopular: responses[1],
        tvNew: responses[2],
        tvCurrent: responses[3]
      };
    }

    const trendingPromise = Promise.all([
      getJSON('trending/movie/week', { language: LANG }),
      getJSON('trending/tv/week', { language: LANG })
    ]);

    let bundles = await Promise.all(
      providers.map(function (provider) {
        return fetchProviderBundle(provider, REGION);
      })
    );

    if (FALLBACK_REGION !== REGION) {
      bundles = await Promise.all(bundles.map(async function (bundle) {
        if (resultCount(bundle) > 0) return bundle;
        const fallback = await fetchProviderBundle(bundle.provider, FALLBACK_REGION);
        return resultCount(fallback) > 0 ? fallback : bundle;
      }));
    }

    const trending = await trendingPromise;
    const movieRanks = rankMap((trending[0] || {}).results || []);
    const tvRanks = rankMap((trending[1] || {}).results || []);
    const byProvider = {};
    const providerRegions = {};

    bundles.forEach(function (bundle) {
      byProvider[bundle.provider] = buildProviderItems(
        bundle.provider,
        bundle,
        movieRanks,
        tvRanks
      );
      providerRegions[bundle.provider] = bundle.region;
    });

    let total = 0;
    providers.forEach(function (provider) {
      total += (byProvider[provider] || []).length;
    });

    res.setHeader(
      'Cache-Control',
      's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=' + STALE_SECONDS
    );

    const generatedAt = new Date().toISOString();
    if (providerQuery && PROVIDERS[providerQuery]) {
      return reply(200, {
        provider: providerQuery,
        region: providerRegions[providerQuery] || REGION,
        generatedAt,
        selectionVersion: SELECTION_VERSION,
        count: (byProvider[providerQuery] || []).length,
        items: byProvider[providerQuery] || []
      });
    }

    return reply(200, {
      region: REGION,
      regions: providerRegions,
      generatedAt,
      selectionVersion: SELECTION_VERSION,
      total,
      byProvider
    });
  } catch (error) {
    return reply(500, {
      error: 'Error interno: ' + (error && error.message ? error.message : 'desconocido')
    });
  }
}

export const config = { maxDuration: 60 };

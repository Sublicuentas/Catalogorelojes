// ============================================================
//  /api/agenda.js  —  Agenda Deportiva (multi-liga, por dia)
//  Para el catalogo Sublicuentas. NO necesita API key.
//  Fuentes: ESPN (site.api.espn.com, publica/sin key) para las
//  ligas grandes, TheSportsDB (key gratis "123") para la Liga
//  Nacional de Honduras (ESPN no la cubre).
//  Llamar:  /api/agenda?date=YYYY-MM-DD   (hora de Honduras)
// ============================================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const hnDate = (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date))
      ? req.query.date
      : hondurasTodayISO();
    const espnDate = hnDate.replace(/-/g, "");

    const CATS = [
      { key: "hn",            label: "🇭🇳 Liga Nacional de Honduras", type: "tsdb", leagueId: "4818" },
      { key: "concacaf",      label: "🌎 CONCACAF Champions Cup", type: "espn", sport: "soccer", slug: "concacaf.champions" },
      { key: "gold",          label: "🏆 Copa Oro CONCACAF", type: "espn", sport: "soccer", slug: "concacaf.gold" },
      { key: "leaguescup",    label: "🌎 Leagues Cup", type: "espn", sport: "soccer", slug: "concacaf.leagues.cup" },
      { key: "mex",           label: "🇲🇽 Liga MX", type: "espn", sport: "soccer", slug: "mex.1" },
      { key: "mls",           label: "🇺🇸 MLS", type: "espn", sport: "soccer", slug: "usa.1" },
      { key: "arg",           label: "🇦🇷 Liga Profesional Argentina", type: "espn", sport: "soccer", slug: "arg.1" },
      { key: "bra",           label: "🇧🇷 Brasileirão", type: "espn", sport: "soccer", slug: "bra.1" },
      { key: "eng",           label: "🏴 Premier League", type: "espn", sport: "soccer", slug: "eng.1" },
      { key: "esp",           label: "🇪🇸 LaLiga", type: "espn", sport: "soccer", slug: "esp.1" },
      { key: "copadelrey",    label: "🏆 Copa del Rey", type: "espn", sport: "soccer", slug: "esp.copa_del_rey" },
      { key: "ita",           label: "🇮🇹 Serie A", type: "espn", sport: "soccer", slug: "ita.1" },
      { key: "ger",           label: "🇩🇪 Bundesliga", type: "espn", sport: "soccer", slug: "ger.1" },
      { key: "fra",           label: "🇫🇷 Ligue 1", type: "espn", sport: "soccer", slug: "fra.1" },
      { key: "ucl",           label: "⭐ UEFA Champions League", type: "espn", sport: "soccer", slug: "uefa.champions" },
      { key: "uel",           label: "🟠 UEFA Europa League", type: "espn", sport: "soccer", slug: "uefa.europa" },
      { key: "uecl",          label: "🟢 UEFA Conference League", type: "espn", sport: "soccer", slug: "uefa.europa.conf" },
      { key: "nations",       label: "🌍 UEFA Nations League", type: "espn", sport: "soccer", slug: "uefa.nations" },
      { key: "libertadores",  label: "🏆 Copa Libertadores", type: "espn", sport: "soccer", slug: "conmebol.libertadores" },
      { key: "sudamericana",  label: "🏆 Copa Sudamericana", type: "espn", sport: "soccer", slug: "conmebol.sudamericana" },
      { key: "ufc",           label: "🥊 UFC · Peleas", type: "espn", sport: "mma", slug: "ufc" },
      { key: "nba",           label: "🏀 NBA", type: "espn", sport: "basketball", slug: "nba" },
      { key: "wnba",          label: "🏀 WNBA", type: "espn", sport: "basketball", slug: "wnba" },
      { key: "mlb",           label: "⚾ MLB", type: "espn", sport: "baseball", slug: "mlb" },
      { key: "nfl",           label: "🏈 NFL", type: "espn", sport: "football", slug: "nfl" },
      { key: "nhl",           label: "🏒 NHL", type: "espn", sport: "hockey", slug: "nhl" },
    ];

    const results = await Promise.allSettled(
      CATS.map((c) => fetchCat(c, espnDate, hnDate))
    );

    const categorias = CATS.map((c, i) => ({
      key: c.key,
      label: c.label,
      partidos: results[i].status === "fulfilled" ? results[i].value : [],
    })).filter((c) => c.partidos.length > 0);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ fecha: hnDate, timezone: "America/Tegucigalpa", categorias });
  } catch (e) {
    res.status(200).json({ error: e.message || "Error cargando la agenda deportiva" });
  }
}

function hondurasTodayISO() {
  const now = new Date(Date.now() - 6 * 60 * 60 * 1000); // UTC-6 fijo (Honduras no usa horario de verano)
  return now.toISOString().slice(0, 10);
}

function horaHN(dateObj) {
  try {
    return dateObj.toLocaleString("es-HN", {
      timeZone: "America/Tegucigalpa",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return "";
  }
}

async function fetchCat(c, espnDate, hnDate) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  try {
    if (c.type === "espn") {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${c.sport}/${c.slug}/scoreboard?dates=${espnDate}`;
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return [];
      const data = await r.json();
      return (data.events || []).flatMap((ev) => {
        if (c.sport === "mma" && ev.competitions && ev.competitions.length) {
          return ev.competitions.map((comp) => mapEspnEvent(ev, comp)).filter(Boolean);
        }
        return [mapEspnEvent(ev)].filter(Boolean);
      });
    }
    if (c.type === "tsdb") {
      const url = `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${hnDate}&l=${c.leagueId}`;
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return [];
      const data = await r.json();
      return (data.events || []).map((ev) => mapTsdbEvent(ev)).filter(Boolean);
    }
    return [];
  } catch (e) {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function mapEspnEvent(ev, competition) {
  try {
    const comp = competition || (ev.competitions && ev.competitions[0]);
    const competitors = (comp && comp.competitors) || [];
    const home = competitors.find((x) => x.homeAway === "home") || competitors[0] || {};
    const away = competitors.find((x) => x.homeAway === "away") || competitors[1] || {};
    const dt = new Date((comp && comp.date) || ev.date);
    const status = (comp && comp.status) || ev.status;
    const st = status && status.type ? status.type : {};
    const isFinalOrLive = st.state === "in" || st.state === "post";
    return {
      local: competitorName(home),
      visita: competitorName(away),
      logoLocal: competitorLogo(home),
      logoVisita: competitorLogo(away),
      horaHN: horaHN(dt),
      estado: st.shortDetail || st.description || "",
      marcadorLocal: isFinalOrLive ? home.score : null,
      marcadorVisita: isFinalOrLive ? away.score : null,
    };
  } catch (e) {
    return null;
  }
}

function competitorName(competitor) {
  const entity = competitor.team || competitor.athlete || competitor;
  return entity.shortDisplayName || entity.displayName || entity.fullName || entity.name || "?";
}

function competitorLogo(competitor) {
  const entity = competitor.team || competitor.athlete || competitor;
  return entity.logo || (entity.headshot && entity.headshot.href) || null;
}

function mapTsdbEvent(ev) {
  try {
    let dt = null;
    if (ev.strTimestamp) {
      const stamp = ev.strTimestamp.includes("T") ? ev.strTimestamp : ev.strTimestamp.replace(" ", "T");
      dt = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(stamp) ? stamp : stamp + "Z");
    }
    else if (ev.dateEvent && ev.strTime) dt = new Date(`${ev.dateEvent}T${ev.strTime}Z`);
    const played = ev.strStatus === "Match Finished" || ev.intHomeScore !== null;
    return {
      local: ev.strHomeTeam || "?",
      visita: ev.strAwayTeam || "?",
      logoLocal: ev.strHomeTeamBadge || null,
      logoVisita: ev.strAwayTeamBadge || null,
      horaHN: dt ? horaHN(dt) : (ev.strTime || ""),
      estado: ev.strStatus || "",
      marcadorLocal: played ? ev.intHomeScore : null,
      marcadorVisita: played ? ev.intAwayScore : null,
    };
  } catch (e) {
    return null;
  }
}

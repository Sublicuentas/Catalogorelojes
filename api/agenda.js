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
  {
    "key": "hn",
    "label": "🇭🇳 Liga Nacional de Honduras",
    "type": "tsdb",
    "leagueId": "4818",
    "alwaysShow": true,
    "sport": "soccer"
  },
  {
    "key": "centralamerica",
    "label": "🏆 Copa Centroamericana Concacaf",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.central.american.cup",
    "alwaysShow": true
  },
  {
    "key": "concacaf",
    "label": "🌎 CONCACAF Champions Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.champions"
  },
  {
    "key": "gold",
    "label": "🏆 Copa Oro CONCACAF",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.gold"
  },
  {
    "key": "leaguescup",
    "label": "🌎 Leagues Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.leagues.cup"
  },
  {
    "key": "mex",
    "label": "🇲🇽 Liga MX",
    "type": "espn",
    "sport": "soccer",
    "slug": "mex.1"
  },
  {
    "key": "mls",
    "label": "🇺🇸 MLS",
    "type": "espn",
    "sport": "soccer",
    "slug": "usa.1"
  },
  {
    "key": "arg",
    "label": "🇦🇷 Liga Profesional Argentina",
    "type": "espn",
    "sport": "soccer",
    "slug": "arg.1"
  },
  {
    "key": "bra",
    "label": "🇧🇷 Brasileirão",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.1"
  },
  {
    "key": "eng",
    "label": "🏴 Premier League",
    "type": "espn",
    "sport": "soccer",
    "slug": "eng.1",
    "alwaysShow": true
  },
  {
    "key": "ksa",
    "label": "🇸🇦 Liga Saudí (Roshn League)",
    "type": "espn",
    "sport": "soccer",
    "slug": "ksa.1",
    "alwaysShow": true
  },
  {
    "key": "esp",
    "label": "🇪🇸 LaLiga",
    "type": "espn",
    "sport": "soccer",
    "slug": "esp.1"
  },
  {
    "key": "copadelrey",
    "label": "🏆 Copa del Rey",
    "type": "espn",
    "sport": "soccer",
    "slug": "esp.copa_del_rey"
  },
  {
    "key": "ita",
    "label": "🇮🇹 Serie A",
    "type": "espn",
    "sport": "soccer",
    "slug": "ita.1"
  },
  {
    "key": "ger",
    "label": "🇩🇪 Bundesliga",
    "type": "espn",
    "sport": "soccer",
    "slug": "ger.1"
  },
  {
    "key": "fra",
    "label": "🇫🇷 Ligue 1",
    "type": "espn",
    "sport": "soccer",
    "slug": "fra.1"
  },
  {
    "key": "ucl",
    "label": "⭐ UEFA Champions League",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.champions"
  },
  {
    "key": "uel",
    "label": "🟠 UEFA Europa League",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.europa"
  },
  {
    "key": "uecl",
    "label": "🟢 UEFA Conference League",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.europa.conf"
  },
  {
    "key": "nations",
    "label": "🌍 UEFA Nations League",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.nations"
  },
  {
    "key": "libertadores",
    "label": "🏆 Copa Libertadores",
    "type": "espn",
    "sport": "soccer",
    "slug": "conmebol.libertadores"
  },
  {
    "key": "sudamericana",
    "label": "🏆 Copa Sudamericana",
    "type": "espn",
    "sport": "soccer",
    "slug": "conmebol.sudamericana"
  },
  {
    "key": "ufc",
    "label": "🥊 UFC · Peleas",
    "type": "espn",
    "sport": "mma",
    "slug": "ufc"
  },
  {
    "key": "nba",
    "label": "🏀 NBA",
    "type": "espn",
    "sport": "basketball",
    "slug": "nba"
  },
  {
    "key": "wnba",
    "label": "🏀 WNBA",
    "type": "espn",
    "sport": "basketball",
    "slug": "wnba"
  },
  {
    "key": "mlb",
    "label": "⚾ MLB",
    "type": "espn",
    "sport": "baseball",
    "slug": "mlb"
  },
  {
    "key": "nfl",
    "label": "🏈 NFL",
    "type": "espn",
    "sport": "football",
    "slug": "nfl"
  },
  {
    "key": "nhl",
    "label": "🏒 NHL",
    "type": "espn",
    "sport": "hockey",
    "slug": "nhl"
  },
  {
    "key": "conmebol.america",
    "label": "Copa América",
    "type": "espn",
    "sport": "soccer",
    "slug": "conmebol.america"
  },
  {
    "key": "uefa.euro",
    "label": "Eurocopa",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.euro"
  },
  {
    "key": "usa.nwsl",
    "label": "NWSL",
    "type": "espn",
    "sport": "soccer",
    "slug": "usa.nwsl"
  },
  {
    "key": "mex.copa_mx",
    "label": "Copa MX",
    "type": "espn",
    "sport": "soccer",
    "slug": "mex.copa_mx"
  },
  {
    "key": "esp.copa_de_la_reina",
    "label": "Spanish Copa de la Reina",
    "type": "espn",
    "sport": "soccer",
    "slug": "esp.copa_de_la_reina"
  },
  {
    "key": "fifa.world",
    "label": "Copa Mundial FIFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.world"
  },
  {
    "key": "fifa.worldq",
    "label": "Eliminatoria Copa Mundial",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq"
  },
  {
    "key": "uefa.wchampions",
    "label": "UEFA Women's Champions League",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.wchampions"
  },
  {
    "key": "esp.w.1",
    "label": "Spanish Liga F",
    "type": "espn",
    "sport": "soccer",
    "slug": "esp.w.1"
  },
  {
    "key": "fifa.worldq.conmebol",
    "label": "Eliminatorias CONMEBOL",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.conmebol"
  },
  {
    "key": "fifa.worldq.concacaf",
    "label": "Eliminatorias CONCACAF",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.concacaf"
  },
  {
    "key": "fifa.worldq.uefa",
    "label": "Eliminatorias UEFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.uefa"
  },
  {
    "key": "campeones.cup",
    "label": "Campeones Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "campeones.cup"
  },
  {
    "key": "fifa.friendly",
    "label": "Amistosos internacionales",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.friendly"
  },
  {
    "key": "fifa.confederations",
    "label": "Copa FIFA Confederaciones",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.confederations"
  },
  {
    "key": "concacaf.w.gold",
    "label": "Concacaf W Gold Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.w.gold"
  },
  {
    "key": "uefa.euroq",
    "label": "Eliminatorias Eurocopa",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.euroq"
  },
  {
    "key": "club.friendly",
    "label": "Amistoso",
    "type": "espn",
    "sport": "soccer",
    "slug": "club.friendly"
  },
  {
    "key": "bel.1",
    "label": "Liga Profesional de Bélgica",
    "type": "espn",
    "sport": "soccer",
    "slug": "bel.1"
  },
  {
    "key": "fifa.cwc",
    "label": "Mundial de Clubes FIFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.cwc"
  },
  {
    "key": "uefa.super_cup",
    "label": "Super Copa UEFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.super_cup"
  },
  {
    "key": "uefa.uefa",
    "label": "Copa UEFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.uefa"
  },
  {
    "key": "concacaf.w.champions_cup",
    "label": "Concacaf W Champions Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.w.champions_cup"
  },
  {
    "key": "global.champs_cup",
    "label": "International Champions Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "global.champs_cup"
  },
  {
    "key": "uefa.intertoto",
    "label": "Copa Intertoto de la UEFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.intertoto"
  },
  {
    "key": "concacaf.superliga",
    "label": "SuperLiga",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.superliga"
  },
  {
    "key": "eng.2",
    "label": "Championship de Inglaterra",
    "type": "espn",
    "sport": "soccer",
    "slug": "eng.2"
  },
  {
    "key": "esp.super_cup",
    "label": "Supercopa Española",
    "type": "espn",
    "sport": "soccer",
    "slug": "esp.super_cup"
  },
  {
    "key": "eng.fa",
    "label": "FA Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "eng.fa"
  },
  {
    "key": "eng.league_cup",
    "label": "Carabao Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "eng.league_cup"
  },
  {
    "key": "ita.coppa_italia",
    "label": "Coppa Italia",
    "type": "espn",
    "sport": "soccer",
    "slug": "ita.coppa_italia"
  },
  {
    "key": "fifa.intercontinental_cup",
    "label": "FIFA Intercontinental Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.intercontinental_cup"
  },
  {
    "key": "ita.super_cup",
    "label": "Supercopa de Italia",
    "type": "espn",
    "sport": "soccer",
    "slug": "ita.super_cup"
  },
  {
    "key": "fifa.olympics",
    "label": "Torneo olímpico masculino",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.olympics"
  },
  {
    "key": "fifa.world.u20",
    "label": "Copa Mundial Sub-20",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.world.u20"
  },
  {
    "key": "fifa.world.u17",
    "label": "Copa Mundial Sub-17",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.world.u17"
  },
  {
    "key": "conmebol.sudamericano_sub20",
    "label": "Sudamericano Sub-20",
    "type": "espn",
    "sport": "soccer",
    "slug": "conmebol.sudamericano_sub20"
  },
  {
    "key": "concacaf.u23",
    "label": "Torneo Sub-23 de la CONCACAF",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.u23"
  },
  {
    "key": "concacaf.confederations_playoff",
    "label": "Copa Confederaciones - Eliminatoria",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.confederations_playoff"
  },
  {
    "key": "concacaf.nations.league",
    "label": "Concacaf Nations League",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.nations.league"
  },
  {
    "key": "intercontinental",
    "label": "Copa Intercontinental",
    "type": "espn",
    "sport": "soccer",
    "slug": "intercontinental"
  },
  {
    "key": "concacaf.champions_cup",
    "label": "CONCACAF - Copa de Campeones",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.champions_cup"
  },
  {
    "key": "concacaf.womens.championship",
    "label": "Concacaf W Championship",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.womens.championship"
  },
  {
    "key": "crc.1",
    "label": "Primera División de Costa Rica",
    "type": "espn",
    "sport": "soccer",
    "slug": "crc.1"
  },
  {
    "key": "slv.1",
    "label": "Primera División de El Salvador",
    "type": "espn",
    "sport": "soccer",
    "slug": "slv.1"
  },
  {
    "key": "gua.1",
    "label": "Liga Nacional de Guatemala",
    "type": "espn",
    "sport": "soccer",
    "slug": "gua.1"
  },
  {
    "key": "col.1",
    "label": "Liga BetPlay",
    "type": "espn",
    "sport": "soccer",
    "slug": "col.1"
  },
  {
    "key": "col.superliga",
    "label": "Superliga de Colombia",
    "type": "espn",
    "sport": "soccer",
    "slug": "col.superliga"
  },
  {
    "key": "chi.1",
    "label": "Primera División: Liga Chilena",
    "type": "espn",
    "sport": "soccer",
    "slug": "chi.1"
  },
  {
    "key": "uru.1",
    "label": "Campeonato Uruguayo",
    "type": "espn",
    "sport": "soccer",
    "slug": "uru.1"
  },
  {
    "key": "par.1",
    "label": "Liga de Paraguay",
    "type": "espn",
    "sport": "soccer",
    "slug": "par.1"
  },
  {
    "key": "per.1",
    "label": "Liga1 de Perú",
    "type": "espn",
    "sport": "soccer",
    "slug": "per.1"
  },
  {
    "key": "ecu.1",
    "label": "LigaPro de Ecuador",
    "type": "espn",
    "sport": "soccer",
    "slug": "ecu.1"
  },
  {
    "key": "bol.1",
    "label": "Liga Profesional Boliviana",
    "type": "espn",
    "sport": "soccer",
    "slug": "bol.1"
  },
  {
    "key": "ven.1",
    "label": "Primera División de Venezuela",
    "type": "espn",
    "sport": "soccer",
    "slug": "ven.1"
  },
  {
    "key": "bra.copa_do_brazil",
    "label": "Copa Do Brazil",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.copa_do_brazil"
  },
  {
    "key": "bra.camp.carioca",
    "label": "Campeonato Carioca",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.camp.carioca"
  },
  {
    "key": "bra.camp.paulista",
    "label": "Campeonato Paulista",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.camp.paulista"
  },
  {
    "key": "bra.camp.gaucho",
    "label": "Campeonato Gaúcho",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.camp.gaucho"
  },
  {
    "key": "fifa.w.olympics",
    "label": "Torneo olímpico femenino",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.w.olympics"
  },
  {
    "key": "panam.m",
    "label": "Fútbol Panamericano - Hombres",
    "type": "espn",
    "sport": "soccer",
    "slug": "panam.m"
  },
  {
    "key": "panam.w",
    "label": "Fútbol Panamericano Mujeres",
    "type": "espn",
    "sport": "soccer",
    "slug": "panam.w"
  },
  {
    "key": "ned.1",
    "label": "Eredivisie",
    "type": "espn",
    "sport": "soccer",
    "slug": "ned.1"
  },
  {
    "key": "por.1",
    "label": "Liga Portugal",
    "type": "espn",
    "sport": "soccer",
    "slug": "por.1"
  },
  {
    "key": "ger.dfb_pokal",
    "label": "Copa de Alemania",
    "type": "espn",
    "sport": "soccer",
    "slug": "ger.dfb_pokal"
  },
  {
    "key": "ger.super_cup",
    "label": "DFB Ligapokal de Alemania",
    "type": "espn",
    "sport": "soccer",
    "slug": "ger.super_cup"
  },
  {
    "key": "fra.coupe_de_la_ligue",
    "label": "Copa de la Liga de Francia",
    "type": "espn",
    "sport": "soccer",
    "slug": "fra.coupe_de_la_ligue"
  },
  {
    "key": "fra.coupe_de_france",
    "label": "Copa de Francia",
    "type": "espn",
    "sport": "soccer",
    "slug": "fra.coupe_de_france"
  },
  {
    "key": "fra.super_cup",
    "label": "Super Copa Francesa",
    "type": "espn",
    "sport": "soccer",
    "slug": "fra.super_cup"
  },
  {
    "key": "ned.cup",
    "label": "Copa de Holanda",
    "type": "espn",
    "sport": "soccer",
    "slug": "ned.cup"
  },
  {
    "key": "uefa.euro_u21",
    "label": "Campeonato Europeo Sub-21",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.euro_u21"
  },
  {
    "key": "uefa.euro.u19",
    "label": "Campeonato europeo sub-19",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.euro.u19"
  },
  {
    "key": "uefa.w.nations",
    "label": "UEFA Women's Nations League",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.w.nations"
  },
  {
    "key": "fifa.wwc",
    "label": "Copa Mundial Femenina de la FIFA",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.wwc"
  },
  {
    "key": "caf.nations",
    "label": "Copa Africana de Naciones",
    "type": "espn",
    "sport": "soccer",
    "slug": "caf.nations"
  },
  {
    "key": "fifa.worldq.afc",
    "label": "Eliminatorias de Asia",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.afc"
  },
  {
    "key": "fifa.worldq.ofc",
    "label": "Eliminatorias de Oceanía",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.ofc"
  },
  {
    "key": "fifa.worldq.caf",
    "label": "Eliminatorias de África",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.caf"
  },
  {
    "key": "afc.asian.cup",
    "label": "Copa de Naciones de Asia",
    "type": "espn",
    "sport": "soccer",
    "slug": "afc.asian.cup"
  },
  {
    "key": "afc.cupq",
    "label": "Eliminatorias Copa de Naciones de Asia",
    "type": "espn",
    "sport": "soccer",
    "slug": "afc.cupq"
  },
  {
    "key": "mex.2",
    "label": "Liga de Expansión MX",
    "type": "espn",
    "sport": "soccer",
    "slug": "mex.2"
  },
  {
    "key": "usa.open",
    "label": "U.S. Open Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "usa.open"
  },
  {
    "key": "arg.2",
    "label": "Primera Nacional de Argentina",
    "type": "espn",
    "sport": "soccer",
    "slug": "arg.2"
  },
  {
    "key": "arg.3",
    "label": "Primera B de Argentina",
    "type": "espn",
    "sport": "soccer",
    "slug": "arg.3"
  },
  {
    "key": "arg.4",
    "label": "Primera C de Argentina",
    "type": "espn",
    "sport": "soccer",
    "slug": "arg.4"
  },
  {
    "key": "arg.5",
    "label": "Primera D de Argentina",
    "type": "espn",
    "sport": "soccer",
    "slug": "arg.5"
  },
  {
    "key": "col.2",
    "label": "Primera B Colombia",
    "type": "espn",
    "sport": "soccer",
    "slug": "col.2"
  },
  {
    "key": "chi.2",
    "label": "Segunda División de Chile",
    "type": "espn",
    "sport": "soccer",
    "slug": "chi.2"
  },
  {
    "key": "chi.super_cup",
    "label": "Chilean Supercopa",
    "type": "espn",
    "sport": "soccer",
    "slug": "chi.super_cup"
  },
  {
    "key": "per.2",
    "label": "Segunda División de Perú",
    "type": "espn",
    "sport": "soccer",
    "slug": "per.2"
  },
  {
    "key": "ecu.2",
    "label": "Ecuador Serie B",
    "type": "espn",
    "sport": "soccer",
    "slug": "ecu.2"
  },
  {
    "key": "par.2",
    "label": "Segunda División de Paraguay",
    "type": "espn",
    "sport": "soccer",
    "slug": "par.2"
  },
  {
    "key": "uru.2",
    "label": "Segunda División de Uruguay",
    "type": "espn",
    "sport": "soccer",
    "slug": "uru.2"
  },
  {
    "key": "bra.2",
    "label": "Campeonato Brasileiro Série B",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.2"
  },
  {
    "key": "bra.brasileiro_u20",
    "label": "Campeonato Sub 20 Brasil",
    "type": "espn",
    "sport": "soccer",
    "slug": "bra.brasileiro_u20"
  },
  {
    "key": "rus.1",
    "label": "Liga Premier de Rusia",
    "type": "espn",
    "sport": "soccer",
    "slug": "rus.1"
  },
  {
    "key": "sco.1",
    "label": "Premier League de Escocia",
    "type": "espn",
    "sport": "soccer",
    "slug": "sco.1"
  },
  {
    "key": "gre.1",
    "label": "Super League de Grecia",
    "type": "espn",
    "sport": "soccer",
    "slug": "gre.1"
  },
  {
    "key": "tur.1",
    "label": "Super Lig de Turquía",
    "type": "espn",
    "sport": "soccer",
    "slug": "tur.1"
  },
  {
    "key": "jpn.1",
    "label": "J League de Japón",
    "type": "espn",
    "sport": "soccer",
    "slug": "jpn.1"
  },
  {
    "key": "rsa.1",
    "label": "Liga Premier de Sudáfrica",
    "type": "espn",
    "sport": "soccer",
    "slug": "rsa.1"
  },
  {
    "key": "esp.2",
    "label": "Segunda División de España",
    "type": "espn",
    "sport": "soccer",
    "slug": "esp.2"
  },
  {
    "key": "ita.2",
    "label": "Serie B de Italia",
    "type": "espn",
    "sport": "soccer",
    "slug": "ita.2"
  },
  {
    "key": "ger.2",
    "label": "Bundesliga 2 de Alemania",
    "type": "espn",
    "sport": "soccer",
    "slug": "ger.2"
  },
  {
    "key": "fra.2",
    "label": "Ligue 2 de Francia",
    "type": "espn",
    "sport": "soccer",
    "slug": "fra.2"
  },
  {
    "key": "ned.2",
    "label": "Eerste Divisie de Holanda",
    "type": "espn",
    "sport": "soccer",
    "slug": "ned.2"
  },
  {
    "key": "sco.2",
    "label": "División 1 de Escocia",
    "type": "espn",
    "sport": "soccer",
    "slug": "sco.2"
  },
  {
    "key": "uefa.carling",
    "label": "Carling Nations Cup",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.carling"
  },
  {
    "key": "afc.champions",
    "label": "AFC Champions League",
    "type": "espn",
    "sport": "soccer",
    "slug": "afc.champions"
  },
  {
    "key": "rsa.2",
    "label": "Primera División Sudáfrica",
    "type": "espn",
    "sport": "soccer",
    "slug": "rsa.2"
  },
  {
    "key": "global.world_football_challenge",
    "label": "World Football Challenge",
    "type": "espn",
    "sport": "soccer",
    "slug": "global.world_football_challenge"
  },
  {
    "key": "aff.championship",
    "label": "Campeonato de fútbol ASEAN",
    "type": "espn",
    "sport": "soccer",
    "slug": "aff.championship"
  },
  {
    "key": "fifa.worldq.concacaf.ofc",
    "label": "Eliminatorias FIFA - Repechaje CONCACAF/OFC",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.concacaf.ofc"
  },
  {
    "key": "fifa.worldq.afc.conmebol",
    "label": "Eliminatorias FIFA - Repechaje AFC/CONMEBOL",
    "type": "espn",
    "sport": "soccer",
    "slug": "fifa.worldq.afc.conmebol"
  },
  {
    "key": "conmebol.america_qual",
    "label": "Eliminatorias Copa América",
    "type": "espn",
    "sport": "soccer",
    "slug": "conmebol.america_qual"
  },
  {
    "key": "chn.1",
    "label": "Superliga China",
    "type": "espn",
    "sport": "soccer",
    "slug": "chn.1"
  },
  {
    "key": "mex.campeon",
    "label": "Campeón de Campeones MX",
    "type": "espn",
    "sport": "soccer",
    "slug": "mex.campeon"
  },
  {
    "key": "uefa.weuro",
    "label": "Eurocopa Femenina",
    "type": "espn",
    "sport": "soccer",
    "slug": "uefa.weuro"
  },
  {
    "key": "concacaf.nations.league_qual",
    "label": "Concacaf Nations League Qualifying",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.nations.league_qual"
  },
  {
    "key": "concacaf.league",
    "label": "Concacaf League",
    "type": "espn",
    "sport": "soccer",
    "slug": "concacaf.league"
  }
];

    const selected = typeof req.query.league === "string" ? req.query.league : "todos";
    const requested = CATS.filter(c => selected === "todos" || c.key === selected || selected === "sport:" + c.sport);
    if (!requested.length) return res.status(400).json({error:"Liga no válida"});
    const results = new Map();
    let cursor = 0;
    await Promise.all(Array.from({length: Math.min(24, requested.length)}, async () => {
      while (cursor < requested.length) {
        const c = requested[cursor++];
        results.set(c.key, await fetchCat(c, espnDate, hnDate));
      }
    }));

    const categorias = CATS.map((c, i) => ({
      key: c.key,
      label: c.label,
      sport: c.sport,
      partidos: results.get(c.key) || [],
    }));

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
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
  const timeout = setTimeout(() => ctrl.abort(), 4000);
  try {
    if (c.type === "espn") {
      // Un partido nocturno en Honduras puede caer en el día siguiente en UTC.
      // Pedimos una ventana de dos días y luego filtramos estrictamente por fecha HN.
      const nextEspnDate = addDaysISO(hnDate, 1).replace(/-/g, "");
      const url = `https://site.api.espn.com/apis/site/v2/sports/${c.sport}/${c.slug}/scoreboard?dates=${espnDate}-${nextEspnDate}&limit=200`;
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return c.key === "centralamerica" ? centralAmericaFallback(hnDate) : [];
      const data = await r.json();
      const events = (data.events || []).filter((ev) => eventDateHN(ev) === hnDate);
      const mapped = events.flatMap((ev) => {
        if (c.sport === "mma" && ev.competitions && ev.competitions.length) {
          return ev.competitions.map((comp) => mapEspnEvent(ev, comp)).filter(Boolean);
        }
        return [mapEspnEvent(ev)].filter(Boolean);
      });
      return mapped.length ? mapped : (c.key === "centralamerica" ? centralAmericaFallback(hnDate) : []);
    }
    if (c.type === "tsdb") {
      const url = `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${hnDate}&l=${c.leagueId}`;
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return [];
      const data = await r.json();
      // TheSportsDB a veces clasifica el partido bajo el día equivocado
      // (usa otra referencia horaria para "eventsday"), lo que hacía que
      // un partido de ayer (ya finalizado) apareciera dentro de "Hoy".
      // Igual que ya se hace arriba con ESPN, se vuelve a validar cada
      // partido contra la fecha pedida usando su hora real en Honduras;
      // si no coincide (o no se puede calcular), se descarta.
      return (data.events || [])
        .map((ev) => mapTsdbEvent(ev))
        .filter(Boolean)
        .filter((ev) => isoDateHN(ev.fechaISO) === hnDate);
    }
    return [];
  } catch (e) {
    return c && c.key === "centralamerica" ? centralAmericaFallback(hnDate) : [];
  } finally {
    clearTimeout(timeout);
  }
}


function addDaysISO(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function eventDateHN(ev) {
  try {
    const raw = (ev && ev.competitions && ev.competitions[0] && ev.competitions[0].date) || (ev && ev.date);
    if (!raw) return "";
    return new Date(new Date(raw).getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  } catch (_) { return ""; }
}

// Misma idea que eventDateHN() pero para un ISO string ya calculado
// (lo usan las fuentes, como TheSportsDB, que no traen el objeto crudo
// del evento sino un fechaISO ya armado por mapTsdbEvent).
function isoDateHN(iso) {
  try {
    if (!iso) return "";
    return new Date(new Date(iso).getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  } catch (_) { return ""; }
}

// Respaldo oficial de cuartos de final 2026. Solo entra si ESPN no devuelve
// la competencia; así la Copa Centroamericana no desaparece del catálogo.
function centralAmericaFallback(hnDate) {
  const games = {
    "2026-09-09": [
      ["Deportivo Saprissa", "CS Cartaginés", "2026-09-09T19:06:00-06:00"],
      ["FC Motagua", "Alianza FC (SLV)", "2026-09-09T21:06:00-06:00"],
    ],
    "2026-09-10": [
      ["CD Marathón", "LD Alajuelense", "2026-09-10T19:06:00-06:00"],
      ["L.A. Firpo", "Club Olimpia Deportivo", "2026-09-10T21:06:00-06:00"],
    ],
    "2026-09-16": [
      ["CS Cartaginés", "Deportivo Saprissa", "2026-09-16T18:30:00-06:00"],
      ["Alianza FC (SLV)", "FC Motagua", "2026-09-16T21:15:00-06:00"],
    ],
    "2026-09-17": [
      ["LD Alajuelense", "CD Marathón", "2026-09-17T18:30:00-06:00"],
      ["Club Olimpia Deportivo", "L.A. Firpo", "2026-09-17T21:15:00-06:00"],
    ],
  };
  return (games[hnDate] || []).map((g) => ({
    local: g[0], visita: g[1], logoLocal: null, logoVisita: null,
    horaHN: horaHN(new Date(g[2])), fechaISO: g[2], estado: "Programado",
    marcadorLocal: null, marcadorVisita: null,
  }));
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
      fechaISO: dt && !isNaN(dt.getTime()) ? dt.toISOString() : null,
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
      fechaISO: dt && !isNaN(dt.getTime()) ? dt.toISOString() : null,
      estado: ev.strStatus || "",
      marcadorLocal: played ? ev.intHomeScore : null,
      marcadorVisita: played ? ev.intAwayScore : null,
    };
  } catch (e) {
    return null;
  }
}

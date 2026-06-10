// ============================================================
//  /api/partidos.js  —  Calendario Mundial 2026 (standalone)
//  Para el catalogo Sublicuentas. NO necesita API key.
//  Datos: openfootball (gratis, dominio publico). Hora de Honduras.
//  Llamar:  /api/partidos?modo=mundial
// ============================================================

export default async function handler(req, res) {
  // CORS (por si se llama desde otro dominio)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Calendario completo del Mundial 2026 desde openfootball (gratis, sin key)
    const r = await fetch("https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json");
    if (!r.ok) return res.status(200).json({ error: "No pude cargar el calendario del Mundial (intentá más tarde)." });
    const data = await r.json();

    // Mapa país (inglés) -> código ISO para la bandera (flagcdn.com)
    const ISO = {
      "Mexico":"mx","Canada":"ca","USA":"us","United States":"us","Argentina":"ar","Brazil":"br","France":"fr",
      "England":"gb-eng","Spain":"es","Germany":"de","Portugal":"pt","Netherlands":"nl","Belgium":"be","Italy":"it",
      "Croatia":"hr","Uruguay":"uy","Colombia":"co","Paraguay":"py","Ecuador":"ec","Peru":"pe","Chile":"cl",
      "Japan":"jp","South Korea":"kr","Korea Republic":"kr","Australia":"au","Iran":"ir","Saudi Arabia":"sa",
      "Qatar":"qa","Morocco":"ma","Senegal":"sn","Tunisia":"tn","Ghana":"gh","Cameroon":"cm","Nigeria":"ng",
      "Egypt":"eg","Algeria":"dz","Ivory Coast":"ci","South Africa":"za","Switzerland":"ch","Denmark":"dk",
      "Poland":"pl","Serbia":"rs","Austria":"at","Czech Republic":"cz","Turkey":"tr","Ukraine":"ua","Scotland":"gb-sct",
      "Wales":"gb-wls","Norway":"no","Sweden":"se","Greece":"gr","Russia":"ru","Costa Rica":"cr","Panama":"pa",
      "Honduras":"hn","Jamaica":"jm","New Zealand":"nz","Uzbekistan":"uz","Jordan":"jo","Bosnia & Herzegovina":"ba",
      "Bosnia and Herzegovina":"ba","Cape Verde":"cv","Curacao":"cw","Curaçao":"cw","Haiti":"ht","Venezuela":"ve",
      "Bolivia":"bo","Guatemala":"gt","El Salvador":"sv","Trinidad & Tobago":"tt","Suriname":"sr","DR Congo":"cd"
    };
    const bandera = nombre => {
      if (!nombre) return null;
      const code = ISO[nombre.trim()];
      return code ? `https://flagcdn.com/w80/${code}.png` : null;
    };

    const ahora = new Date(Date.now() - 3*60*60*1000);
    const matches = (data.matches || []);
    const conFecha = matches.map(m => {
      const tm = (m.time||"").match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d+)?/);
      const off = tm && tm[3] ? parseInt(tm[3],10) : -6;
      const dObj = new Date(`${m.date}T${tm?`${tm[1].padStart(2,"0")}:${tm[2]}`:"12:00"}:00${off<0?"-":"+"}${String(Math.abs(off)).padStart(2,"0")}:00`);
      return { m, dObj };
    });
    const futuros = conFecha.filter(x => x.dObj >= ahora).sort((a,b)=>a.dObj-b.dObj);
    const lista = (futuros.length ? futuros : conFecha.sort((a,b)=>a.dObj-b.dObj));
    const partidos = lista.slice(0, 64).map(({m,dObj}) => {
      const horaHN = dObj.toLocaleString("es-HN", {
        timeZone:"America/Tegucigalpa", weekday:"short", day:"numeric",
        month:"short", hour:"2-digit", minute:"2-digit", hour12:true
      });
      return {
        liga: "Mundial 2026 · " + (m.group || m.round || ""),
        local: m.team1, logoLocal: bandera(m.team1),
        visita: m.team2, logoVisita: bandera(m.team2),
        estado: "NS",
        horaHN: horaHN + (m.ground ? " · " + m.ground : ""),
        canal: "Tigo Sports (300/301) · Satelital 10/13 · App Tigo Sports HN · Televicentro (señal abierta)"
      };
    });
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({ partidos });
  } catch (e) {
    return res.status(200).json({ error: "Error interno: " + (e && e.message ? e.message : "desconocido") });
  }
}

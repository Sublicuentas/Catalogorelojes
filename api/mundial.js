// ============================================================
//  /api/mundial.js  —  Calendario Mundial 2026 (Vercel, CommonJS)
//  Datos: openfootball (gratis, dominio publico, sin key)
//  Banderas: flagcdn.com (gratis, sin key)
//  Horarios convertidos a hora de Honduras (UTC-6).
//  Va en la carpeta /api del repo: api/mundial.js
// ============================================================

// Nombre de pais (ingles, como viene en openfootball) -> codigo ISO2 (flagcdn)
const ISO = {
  "Qatar":"qa","Ecuador":"ec","Senegal":"sn","Netherlands":"nl","England":"gb-eng","Iran":"ir","United States":"us","USA":"us",
  "Wales":"gb-wls","Argentina":"ar","Saudi Arabia":"sa","Mexico":"mx","Poland":"pl","France":"fr","Australia":"au",
  "Denmark":"dk","Tunisia":"tn","Spain":"es","Costa Rica":"cr","Germany":"de","Japan":"jp","Belgium":"be","Canada":"ca",
  "Morocco":"ma","Croatia":"hr","Brazil":"br","Serbia":"rs","Switzerland":"ch","Cameroon":"cm","Portugal":"pt","Ghana":"gh",
  "Uruguay":"uy","South Korea":"kr","Korea Republic":"kr","Korea":"kr","Colombia":"co","Peru":"pe","Chile":"cl","Paraguay":"py",
  "Bolivia":"bo","Venezuela":"ve","Honduras":"hn","Panama":"pa","Jamaica":"jm","El Salvador":"sv","Guatemala":"gt",
  "Italy":"it","Norway":"no","Sweden":"se","Austria":"at","Scotland":"gb-sct","Turkey":"tr","Ukraine":"ua","Greece":"gr",
  "Nigeria":"ng","Egypt":"eg","Algeria":"dz","Ivory Coast":"ci","Cote d'Ivoire":"ci","South Africa":"za","Mali":"ml",
  "Cape Verde":"cv","Burkina Faso":"bf","DR Congo":"cd","New Zealand":"nz","Jordan":"jo","Uzbekistan":"uz","Iraq":"iq",
  "United Arab Emirates":"ae","Qatar ":"qa","Russia":"ru","Czech Republic":"cz","Czechia":"cz","Romania":"ro","Hungary":"hu",
  "Slovakia":"sk","Slovenia":"si","Ireland":"ie","Republic of Ireland":"ie","Northern Ireland":"gb-nir","Iceland":"is",
  "Finland":"fi","Curacao":"cw","Haiti":"ht","Trinidad and Tobago":"tt","Suriname":"sr","Angola":"ao","Tanzania":"tz"
};

function flag(name){
  if(!name) return "";
  var code = ISO[name.trim()];
  if(!code) return "";
  return "https://flagcdn.com/w40/" + code + ".png";
}

const SOURCES = [
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.schedule.json"
];

// UTC -> Honduras (UTC-6), devuelve {time, dateLabel, sortKey}
function toHN(dateStr, timeStr){
  // openfootball: date "2026-06-11", time "16:00" (suele venir en hora local de sede; lo tratamos como UTC aprox.)
  try{
    var iso = dateStr + "T" + (timeStr || "00:00") + ":00Z";
    var d = new Date(iso);
    if(isNaN(d.getTime())) return { time: timeStr||"", dateLabel: dateStr, sortKey: dateStr+(timeStr||"") };
    var hn = new Date(d.getTime() - 6*3600*1000);
    var dias=["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
    var meses=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    var hh=String(hn.getUTCHours()).padStart(2,"0");
    var mm=String(hn.getUTCMinutes()).padStart(2,"0");
    var label = dias[hn.getUTCDay()] + " " + hn.getUTCDate() + " " + meses[hn.getUTCMonth()] + " " + hn.getUTCFullYear();
    return { time: hh+":"+mm, dateLabel: label, sortKey: hn.getTime() };
  }catch(e){
    return { time: timeStr||"", dateLabel: dateStr, sortKey: dateStr };
  }
}

module.exports = async (req, res) => {
  try {
    var raw=null, used=null;
    for (var i=0;i<SOURCES.length;i++){
      try{
        var r = await fetch(SOURCES[i]);
        if(r.ok){ raw = await r.json(); used=SOURCES[i]; break; }
      }catch(e){}
    }
    if(!raw) return res.status(502).json({ error: "No se pudo cargar el calendario (openfootball)" });

    // openfootball estructura: { rounds: [ { name, matches:[{date,time,team1,team2,...}] } ] }
    var out = [];
    var rounds = raw.rounds || [];
    rounds.forEach(function(round){
      var stage = round.name || "";
      (round.matches || []).forEach(function(mt){
        var t1 = (mt.team1 && (mt.team1.name||mt.team1)) || mt.home || "";
        var t2 = (mt.team2 && (mt.team2.name||mt.team2)) || mt.away || "";
        if(typeof t1==="object") t1 = t1.name||"";
        if(typeof t2==="object") t2 = t2.name||"";
        var conv = toHN(mt.date, mt.time);
        out.push({
          home: t1 || "Por definir",
          away: t2 || "Por definir",
          homeFlag: flag(t1),
          awayFlag: flag(t2),
          time: conv.time,
          dateLabel: conv.dateLabel,
          stage: stage,
          sortKey: conv.sortKey
        });
      });
    });

    out.sort(function(a,b){ return (a.sortKey>b.sortKey?1:(a.sortKey<b.sortKey?-1:0)); });
    out.forEach(function(m){ delete m.sortKey; });

    // Cache 12h, se refresca solo (asi "actualiza" sin tocar nada)
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json({ count: out.length, source: used, matches: out });
  } catch (e) {
    return res.status(500).json({ error: "Error interno: " + (e && e.message ? e.message : "desconocido") });
  }
};

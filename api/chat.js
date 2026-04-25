export default async function handler(req, res) {
  try {
    const msg = req.body?.message || req.body?.text || req.body?.prompt || "Hola";

    const modelsRes = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      }
    });

    const modelsData = await modelsRes.json();

    if (!modelsRes.ok) {
      return res.status(200).json({
        reply: "Error con API key: " + (modelsData?.error?.message || JSON.stringify(modelsData))
      });
    }

    const model =
      modelsData?.data?.[0]?.id ||
      "claude-3-haiku-20240307";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: "Usted es SubliBot, asesor digital de Sublicuentas. Responda corto, amable y vendedor. Venda Netflix, Disney+, Max, Prime Video, YouTube Premium, Spotify, Crunchyroll, Vix, Apple TV, Universal+, IPTV y promociones digitales. Trate siempre al cliente de usted.",
        messages: [
          {
            role: "user",
            content: msg
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        reply: "Error modelo: " + (data?.error?.message || JSON.stringify(data))
      });
    }

    return res.status(200).json({
      reply: data?.content?.[0]?.text || "No pude responder."
    });

  } catch (e) {
    return res.status(500).json({
      reply: "Error servidor: " + e.message
    });
  }
}

export default async function handler(req, res) {
  try {
    const body = req.body || {};

    const userMessage =
      body.message ||
      body.text ||
      body.prompt ||
      body.query ||
      "Hola";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-0",
        max_tokens: 250,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userMessage
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    console.log("ANTHROPIC:", data);

    if (!response.ok) {
      return res.status(200).json({
        reply: "ERROR API: " + JSON.stringify(data.error || data)
      });
    }

    const reply =
      data?.content?.[0]?.text ||
      "No hubo respuesta.";

    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({
      reply: "ERROR SERVER: " + e.message
    });
  }
}

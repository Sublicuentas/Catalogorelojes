export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Método no permitido"
    });
  }

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
        model: "claude-3-5-haiku-latest",
        max_tokens: 300,
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

    console.log("ANTHROPIC RESPONSE:", data);

    if (!response.ok) {
      return res.status(200).json({
        reply:
          "Error API: " +
          (data?.error?.message || JSON.stringify(data))
      });
    }

    const reply =
      data?.content?.[0]?.text ||
      "No pude responder en este momento.";

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      reply: "Error servidor: " + error.message
    });
  }
}

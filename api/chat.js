export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Método no permitido" });
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
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    const reply =
      data?.content?.[0]?.text ||
      data?.error?.message ||
      "No pude responder.";

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({
      reply: "Error: " + err.message
    });
  }
}

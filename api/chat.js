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
        model: "claude-3-haiku-20240307",
        max_tokens: 250,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    console.log(data);

    const reply =
      data?.content?.[0]?.text ||
      data?.error?.message ||
      "No pude responder.";

    res.status(200).json({ reply });

  } catch (e) {
    res.status(500).json({
      reply: e.message
    });
  }
}

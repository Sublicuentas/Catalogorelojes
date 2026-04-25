export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-7-sonnet-latest",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: req.body.message
          }
        ]
      })
    });

    const data = await response.json();

    res.status(200).json({
      reply: data.content?.[0]?.text || "Sin respuesta"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, max_tokens, system, messages } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',  // modelo que ya funcionaba antes
        max_tokens: max_tokens || 500,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        reply: 'Error API: ' + (data?.error?.message || JSON.stringify(data))
      });
    }

    const reply = data?.content?.[0]?.text || 'No pude responder en este momento.';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: 'Error servidor: ' + err.message });
  }
}

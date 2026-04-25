// Vercel Serverless Function: /api/chat
// Configure ANTHROPIC_API_KEY en Vercel > Settings > Environment Variables.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en Vercel' });

    const body = req.body || {};
    const payload = {
      model: body.model || 'claude-3-5-haiku-20241022',
      max_tokens: Number(body.max_tokens || 420),
      system: body.system || '',
      messages: Array.isArray(body.messages) ? body.messages : []
    };

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || data.error || text });

    const reply = data.content?.find(part => part.type === 'text')?.text || data.content?.[0]?.text || '';
    return res.status(200).json({ reply, content: data.content });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}

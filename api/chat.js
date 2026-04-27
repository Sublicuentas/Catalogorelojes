export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, max_tokens, system, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(200).json({ reply: 'Sin mensajes recibidos.' });
    }

    // Limpiar: solo user/assistant con contenido
    let limpios = messages.filter(m =>
      (m.role === 'user' || m.role === 'assistant') &&
      m.content && String(m.content).trim().length > 0
    );

    // Anthropic requiere que empiece con 'user'
    while (limpios.length > 0 && limpios[0].role === 'assistant') {
      limpios = limpios.slice(1);
    }

    // Debe terminar en 'user'
    while (limpios.length > 0 && limpios[limpios.length - 1].role === 'assistant') {
      limpios = limpios.slice(0, -1);
    }

    if (limpios.length === 0) {
      return res.status(200).json({ reply: 'No hay mensajes del usuario aún.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 500,
        system: system || '',
        messages: limpios
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        reply: 'Error API: ' + (data?.error?.message || JSON.stringify(data))
      });
    }

    const reply = data?.content?.[0]?.text || 'Sin respuesta.';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: 'Error: ' + err.message });
  }
}

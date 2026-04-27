export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, max_tokens, system, messages } = req.body;

    // Validar que lleguen los datos
    if (!messages || !Array.isArray(messages)) {
      return res.status(200).json({ reply: 'Error: mensajes no recibidos correctamente.' });
    }

    // Filtrar mensajes validos (solo user y assistant, sin vacios)
    const mensajesLimpios = messages.filter(m =>
      (m.role === 'user' || m.role === 'assistant') &&
      m.content && m.content.trim().length > 0
    );

    if (mensajesLimpios.length === 0) {
      return res.status(200).json({ reply: 'Error: no hay mensajes válidos.' });
    }

    // El ultimo mensaje debe ser del usuario
    const ultimoMensaje = mensajesLimpios[mensajesLimpios.length - 1];
    if (ultimoMensaje.role !== 'user') {
      return res.status(200).json({ reply: 'Error: el último mensaje debe ser del usuario.' });
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
        messages: mensajesLimpios
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || JSON.stringify(data);
      return res.status(200).json({ reply: 'Error API: ' + errorMsg });
    }

    const reply = data?.content?.[0]?.text || 'Sin respuesta.';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: 'Error servidor: ' + err.message });
  }
}

// api/telegram-compra.js
// Recibe la ficha de compra + comprobante (foto) y los envÃ­a a TODOS los admins de Telegram.
// Variables de entorno necesarias en Vercel:
//   TELEGRAM_TOKEN    = token del bot (ya configurado)
//   TELEGRAM_ADMIN_ID = uno o varios chat_id separados por coma
//                       ej: "123456789,987654321,555555555"

export default async function handler(req, res) {
  // CORS bÃ¡sico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = process.env.TELEGRAM_TOKEN;
  const ADMIN_RAW = process.env.TELEGRAM_ADMIN_ID;

  if (!TOKEN || !ADMIN_RAW) {
    return res.status(500).json({
      error: 'Faltan variables: TELEGRAM_TOKEN o TELEGRAM_ADMIN_ID en Vercel',
    });
  }

  // Soporta 1 o varios admins separados por coma (o espacios / saltos de lÃ­nea)
  const ADMINS = ADMIN_RAW.split(/[,\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const ficha = body.ficha || 'Sin ficha';
    const comprobanteB64 = body.comprobante_base64 || null;

    const API = `https://api.telegram.org/bot${TOKEN}`;

    // Preparar el buffer de la foto una sola vez (si existe)
    let photoBuffer = null;
    if (comprobanteB64) {
      const base64Data = comprobanteB64.replace(/^data:image\/\w+;base64,/, '');
      photoBuffer = Buffer.from(base64Data, 'base64');
    }

    const resultados = [];

    // Enviar a cada admin
    for (const chatId of ADMINS) {
      // 1) Ficha de texto
      try {
        await fetch(`${API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: ficha, parse_mode: 'HTML' }),
        });
      } catch (e) {
        resultados.push({ chatId, msg: 'error texto: ' + e.message });
        continue;
      }

      // 2) Foto del comprobante (si hay)
      if (photoBuffer) {
        const boundary = '----SubliBoundary' + Date.now() + Math.random().toString(16).slice(2);
        const parts = [];
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`
        ));
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nðŸ“¸ Comprobante de pago\r\n`
        ));
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="comprobante.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
        ));
        parts.push(photoBuffer);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        const multipartBody = Buffer.concat(parts);

        try {
          await fetch(`${API}/sendPhoto`, {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': multipartBody.length,
            },
            body: multipartBody,
          });
        } catch (e) {
          resultados.push({ chatId, msg: 'error foto: ' + e.message });
          continue;
        }
      }

      resultados.push({ chatId, msg: 'ok' });
    }

    return res.status(200).json({ ok: true, admins: ADMINS.length, resultados });
  } catch (err) {
    console.error('Error enviando a Telegram:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

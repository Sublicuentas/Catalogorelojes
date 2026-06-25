// api/_lib/tg.js
// Manda mensajes y fotos al Telegram de los admins.
// Necesita TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en variables de entorno.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

export async function tgMessage(text) {
  if (!TOKEN || !CHAT) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'Markdown' })
  });
}

// dataUrl = "data:image/jpeg;base64,...."  (la captura del comprobante)
export async function tgPhoto(dataUrl, caption) {
  if (!TOKEN || !CHAT) return;
  if (!dataUrl || !dataUrl.startsWith('data:')) return tgMessage(caption);
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  const form = new FormData();
  form.append('chat_id', CHAT);
  form.append('caption', caption);
  form.append('parse_mode', 'Markdown');
  form.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'comprobante.jpg');
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { method: 'POST', body: form });
}

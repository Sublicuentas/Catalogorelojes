import { loadCatalogSnapshot, saveCatalogSnapshot, loadCatalogHistory } from './_lib/catalog-store.js';

function secretOf(req) {
  return String(req.headers['x-catalog-sync-secret'] || '').trim();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  const configured = String(process.env.CATALOGO_SYNC_SECRET || '').trim();
  if (!configured) return res.status(503).json({ ok: false, error: 'Falta CATALOGO_SYNC_SECRET en el catálogo.' });
  if (secretOf(req) !== configured) return res.status(401).json({ ok: false, error: 'Clave de sincronización inválida.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'load') {
      const [snapshot, history] = await Promise.all([loadCatalogSnapshot(), loadCatalogHistory(15)]);
      return res.status(200).json({ ok: true, catalog: snapshot.catalog, history, source: snapshot.source });
    }

    if (action === 'save') {
      const actor = String(body.actor || 'sublichat').slice(0, 120);
      const catalog = await saveCatalogSnapshot(body.catalog || {}, actor);
      return res.status(200).json({ ok: true, catalog, message: `Catálogo publicado · versión ${catalog.catalogVersion}` });
    }

    return res.status(400).json({ ok: false, error: 'Acción no válida.' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error && error.message || error || 'Error interno.') });
  }
}

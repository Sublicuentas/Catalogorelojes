import { loadCatalogSnapshot } from './_lib/catalog-store.js';
import { publicCatalog } from './_lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const snapshot = await loadCatalogSnapshot();
    const catalog = publicCatalog(snapshot.catalog);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      catalog,
      source: snapshot.source,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo cargar el catálogo.'
    });
  }
}

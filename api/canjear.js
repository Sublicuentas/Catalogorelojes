// api/canjear.js
// Canjea puntos usando los costos del catálogo central.
import { db, FieldValue } from './_lib/firebase.js';
import { tgMessage } from './_lib/tg.js';
import { loadCatalogSnapshot } from './_lib/catalog-store.js';
import { AVAILABILITY, publicCatalog } from './_lib/catalog.js';
import { storeClientFromRequest } from './_lib/store-session.js';

const LEGACY_NAMES = {
  'Vix Premium': ['vix', 'monthly'],
  'Deezer Premium': ['deezer', 'monthly'],
  'Canva Edu Pro': ['canva', 'membership'],
  'Disney Standard': ['disney', 'standard'],
  'Mubi Premium': ['mubi', 'monthly-redemption']
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const authenticatedClient = await storeClientFromRequest(req);
    if (!authenticatedClient) {
      return res.status(401).json({ ok: false, error: 'Inicie sesión nuevamente.' });
    }

    const catalogSnapshot = await loadCatalogSnapshot();
    const catalog = publicCatalog(catalogSnapshot.catalog);
    const legacy = LEGACY_NAMES[b.app] || [];
    const productId = String(b.productId || legacy[0] || '');
    const planId = String(b.planId || legacy[1] || '');
    const product = catalog.products.find((candidate) => candidate.id === productId);
    const plan = product && product.plans.find((candidate) => candidate.id === planId);
    const costo = Number(plan && plan.pointsCost) || 0;
    if (
      !product ||
      !plan ||
      !plan.active ||
      !costo ||
      !AVAILABILITY[product.availability].purchasable ||
      !AVAILABILITY[plan.availability].purchasable
    ) {
      return res.status(400).json({ ok: false, error: 'Ese beneficio no está disponible para canje.' });
    }

    const cliRef = db.collection('clientes').doc(authenticatedClient.id);
    const cliente = await db.runTransaction(async (t) => {
      const snap = await t.get(cliRef);
      if (!snap.exists) throw new Error('Cliente no encontrado.');
      const c = snap.data();
      if ((c.puntos || 0) < costo) throw new Error('No tenés suficientes puntos.');
      t.update(cliRef, { puntos: FieldValue.increment(-costo) });
      return c;
    });

    await db.collection('canjes').add({
      clienteId: authenticatedClient.id,
      clienteNombre: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
      productId,
      planId,
      app: product.name,
      plan: plan.name,
      costo,
      estado: 'pendiente',
      createdAt: FieldValue.serverTimestamp()
    });

    await tgMessage(
      `🎁 *CANJE DE PUNTOS*\n\n${cliente.nombre || ''} ${cliente.apellido || ''} (${cliente.telefono || ''})\nCanjeó *${product.name} / ${plan.name}* por *${costo} pts*.`
    );

    return res.status(200).json({ ok: true, puntos: (cliente.puntos || 0) - costo });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}

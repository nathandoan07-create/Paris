// Paname Roof — backend
// Serves the static site and exposes a small API for Stripe Checkout.
// Secret data (addresses + access codes) lives in ./zones.js and is only sent
// to the browser by /api/unlock, AFTER Stripe confirms the payment.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const { ZONES, PASS, publicZones, findZone, isSellable } = require('./zones');

const app = express();
const PORT = process.env.PORT || 4242;
// On Render, RENDER_EXTERNAL_URL is provided automatically.
const BASE_URL = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || ('http://localhost:' + PORT);
const CURRENCY = 'eur';
const MAX_QTY = 3; // max 3 groups (= 3 sales) per rooftop
const KEY_PRICE = 15; // optional add-on: buy the key and have it mailed (key-access rooftops)
const PROMO = { code: 'BIENVENUE10', percent: 10 }; // -10% newsletter (first purchase)
const SUBS_FILE = path.join(__dirname, 'subscribers.json');

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
// Demo mode is ON only when Stripe is NOT configured, so you can click through
// the whole flow locally without keys. With real keys it is always OFF.
const DEMO = !stripe;

// --- Stripe webhook (needs the raw body, so it must come BEFORE express.json) ---
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(200).json({ received: true, demo: true });
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = secret ? stripe.webhooks.constructEvent(req.body, sig, secret) : JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send('Webhook signature verification failed: ' + err.message);
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    console.log('[paid]', s.id, s.metadata && s.metadata.type, s.customer_details && s.customer_details.email);
  }
  res.json({ received: true });
});

app.use(express.json());

// --- Public config + catalogue (no secrets) ---
app.get('/api/config', (req, res) => {
  res.json({ currency: CURRENCY, pass: { id: PASS.id, label: PASS.label, price: PASS.price }, demo: DEMO });
});
app.get('/api/zones', (req, res) => {
  res.json({ zones: publicZones(), pass: { id: PASS.id, label: PASS.label, price: PASS.price } });
});

// --- Newsletter signup (stores emails; returns the -10% code) ---
function readSubs() { try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch (e) { return []; } }
app.post('/api/subscribe', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail invalide.' });
  const subs = readSubs();
  if (!subs.some((s) => s.email === email)) {
    subs.push({ email: email, date: new Date().toISOString() });
    try { fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2)); }
    catch (e) { console.error('subscribers write failed', e.message); }
  }
  res.json({ ok: true, code: PROMO.code, percent: PROMO.percent });
});

// Add the optional physical-key line item + shipping details. The key works on
// every address, so it's offered on individual key rooftops and on the Pass.
function addKey(body, metadata, line_items) {
  metadata.key = '1';
  if (body.ship) {
    metadata.ship_name = String(body.ship.name || '').slice(0, 200);
    metadata.ship_phone = String(body.ship.phone || '').slice(0, 50);
    metadata.ship_address = String(body.ship.address || '').slice(0, 400);
  }
  line_items.push({
    quantity: 1,
    price_data: { currency: CURRENCY, unit_amount: KEY_PRICE * 100,
      product_data: { name: 'Paname Roof — Clé (envoi postal)' } }
  });
}

// --- Create a Checkout Session ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { type } = req.body || {};
    let line_items, metadata, label;

    if (type === 'pass') {
      label = PASS.label;
      metadata = { type: 'pass' };
      line_items = [{
        quantity: 1,
        price_data: { currency: CURRENCY, unit_amount: PASS.price * 100,
          product_data: { name: 'Paname Roof — ' + PASS.label, description: 'Accès à tous les toits' } }
      }];
      if (req.body.key === true) addKey(req.body, metadata, line_items);
    } else if (type === 'zone') {
      const zone = findZone(req.body.zoneId);
      if (!zone) return res.status(404).json({ error: 'Toit introuvable.' });
      if (!isSellable(zone)) return res.status(409).json({ error: 'Ce toit n\'est pas disponible.' });
      let qty = parseInt(req.body.qty, 10) || 1;
      qty = Math.max(1, Math.min(MAX_QTY, Math.min(zone.left, qty)));
      label = zone.name;
      metadata = { type: 'zone', zoneId: zone.id, qty: String(qty) };
      line_items = [{
        quantity: qty,
        price_data: { currency: CURRENCY, unit_amount: zone.price * 100,
          product_data: { name: 'Paname Roof — ' + zone.name, description: zone.area + ' · ' + zone.view } }
      }];
      // Optional add-on: buy the physical key (only for key-access rooftops).
      if (req.body.key === true) addKey(req.body, metadata, line_items);
    } else {
      return res.status(400).json({ error: 'Type d\'achat invalide.' });
    }

    // Promo code -10% (newsletter): discount every line item.
    if (req.body.promo && String(req.body.promo).trim().toUpperCase() === PROMO.code) {
      metadata.promo = PROMO.code;
      line_items = line_items.map(function (li) {
        li.price_data.unit_amount = Math.round(li.price_data.unit_amount * (1 - PROMO.percent / 100));
        return li;
      });
    }

    // Demo mode (no Stripe key): skip Stripe and go straight to a demo success page.
    if (DEMO) {
      const q = new URLSearchParams(Object.assign({ demo: '1' }, metadata)).toString();
      return res.json({ url: '/success.html?' + q, demo: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      metadata,
      success_url: BASE_URL + '/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: BASE_URL + '/#zones'
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error', err.message);
    res.status(500).json({ error: 'Paiement indisponible. Réessayez.' });
  }
});

// --- Reveal address + access AFTER payment is verified ---
function unlockPayload(metadata) {
  const reveal = (z) => ({
    id: z.id, name: z.name, area: z.area, address: z.address,
    accessMethod: z.access.method, accessValue: z.access.value, accessNote: z.access.note || ''
  });
  if (metadata.type === 'pass') {
    return { type: 'pass', pass: PASS.label, items: ZONES.filter((z) => (z.status || 'available') !== 'pending').map(reveal) };
  }
  const zone = findZone(metadata.zoneId);
  if (!zone) return null;
  return { type: 'zone', qty: parseInt(metadata.qty, 10) || 1, item: reveal(zone) };
}

app.get('/api/unlock', async (req, res) => {
  try {
    // Demo mode: reveal from the query metadata (no payment). Disabled once Stripe is set.
    if (DEMO && req.query.demo === '1') {
      const payload = unlockPayload({ type: req.query.type, zoneId: req.query.zoneId, qty: req.query.qty });
      if (!payload) return res.status(404).json({ error: 'Introuvable.' });
      return res.json(Object.assign({ demo: true }, payload));
    }
    const sessionId = req.query.session_id;
    if (!sessionId || !stripe) return res.status(400).json({ error: 'Session manquante.' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Paiement non confirmé.' });
    const payload = unlockPayload(session.metadata || {});
    if (!payload) return res.status(404).json({ error: 'Introuvable.' });
    res.json(payload);
  } catch (err) {
    console.error('unlock error', err.message);
    res.status(500).json({ error: 'Impossible de récupérer votre réservation.' });
  }
});

// --- Static site (index.html, success.html) ---
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log('Paname Roof on ' + BASE_URL + (DEMO ? '  [DEMO — no Stripe key]' : '  [Stripe live]'));
});

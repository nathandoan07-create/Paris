// Mai Anh Nails — backend
// Sert le site statique + une petite API : catalogue, créneaux disponibles,
// paiement Stripe (RDV payé en ligne, sans commission d'intermédiaire) et
// confirmation de réservation après paiement vérifié auprès de Stripe.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const {
  SALON, HOURS, SLOT_STEP, BOOKING_WINDOW_DAYS, MIN_LEAD_MIN,
  findService, publicCatalogue,
} = require('./salon');

const app = express();
const PORT = process.env.PORT || 4321;
const BASE_URL = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || ('http://localhost:' + PORT);
const CURRENCY = 'eur';
const HOLD_MINUTES = 20; // durée pendant laquelle un créneau est bloqué le temps de payer
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
// Mode démo : actif seulement SANS clé Stripe (pour cliquer le parcours en local
// sans encaisser). Dès qu'une clé est présente, le paiement réel est exigé.
const DEMO = !stripe;

// ---------- Stockage des réservations (fichier JSON) ----------
function readBookings() {
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); } catch (e) { return []; }
}
function writeBookings(list) {
  try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2)); }
  catch (e) { console.error('bookings write failed', e.message); }
}
// Réservations "actives" = confirmées + blocages (holds) non expirés.
function activeBookings(list, nowMs) {
  return list.filter((b) => b.status === 'confirmed' || (b.status === 'hold' && b.holdExpires > nowMs));
}

// ---------- Temps / dates (fuseau Europe/Paris) ----------
function parisNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const p = {};
  parts.forEach((x) => { p[x.type] = x.value; });
  return {
    date: p.year + '-' + p.month + '-' + p.day,
    minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10),
  };
}
function weekdayOf(dateStr) {
  // Le jour de la semaine d'une date calendaire ne dépend pas du fuseau.
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}
function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr + 'T00:00:00Z').getTime());
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function daysBetween(a, b) {
  const ms = new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z');
  return Math.round(ms / 86400000);
}

// ---------- Créneaux disponibles ----------
function availableSlots(dateStr, service) {
  const hours = HOURS[weekdayOf(dateStr)];
  if (!hours) return [];
  const now = parisNow();
  const isToday = dateStr === now.date;
  const list = readBookings();
  const active = activeBookings(list, Date.now());
  const slots = [];
  const lastStart = hours.close - service.duration;
  for (let start = hours.open; start <= lastStart; start += SLOT_STEP) {
    const end = start + service.duration;
    if (isToday && start < now.minutes + MIN_LEAD_MIN) continue; // trop tôt aujourd'hui
    // Compte les RDV qui chevauchent [start, end).
    let overlap = 0;
    for (const b of active) {
      if (b.date === dateStr && b.start < end && b.end > start) overlap++;
    }
    if (overlap < SALON.capacity) slots.push(toHHMM(start));
  }
  return slots;
}

// ---------- Stripe webhook (corps brut : AVANT express.json) ----------
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
    confirmBySession(event.data.object.id, event.data.object.customer_details);
    console.log('[payé]', event.data.object.id);
  }
  res.json({ received: true });
});

app.use(express.json());

// ---------- API publique (catalogue, horaires, dispo) ----------
app.get('/api/config', (req, res) => {
  res.json({
    currency: CURRENCY, demo: DEMO, capacity: SALON.capacity,
    windowDays: BOOKING_WINDOW_DAYS, minLeadMin: MIN_LEAD_MIN,
    hours: HOURS, today: parisNow().date,
    ...publicCatalogue(),
  });
});

app.get('/api/availability', (req, res) => {
  const date = String(req.query.date || '');
  const service = findService(String(req.query.serviceId || ''));
  if (!isValidDate(date)) return res.status(400).json({ error: 'Date invalide.' });
  if (!service) return res.status(404).json({ error: 'Prestation introuvable.' });
  const now = parisNow();
  const delta = daysBetween(now.date, date);
  if (delta < 0) return res.json({ date, slots: [] });
  if (delta > BOOKING_WINDOW_DAYS) return res.json({ date, slots: [] });
  res.json({ date, slots: availableSlots(date, service) });
});

// ---------- Créer une session de paiement (bloque le créneau) ----------
app.post('/api/checkout', async (req, res) => {
  try {
    const body = req.body || {};
    const service = findService(String(body.serviceId || ''));
    if (!service) return res.status(404).json({ error: 'Prestation introuvable.' });
    const date = String(body.date || '');
    if (!isValidDate(date)) return res.status(400).json({ error: 'Date invalide.' });
    const start = parseInt(body.start, 10);
    if (!Number.isInteger(start)) return res.status(400).json({ error: 'Créneau invalide.' });

    const name = String(body.name || '').trim().slice(0, 120);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const email = String(body.email || '').trim().slice(0, 160);
    if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis.' });

    // Le créneau demandé est-il toujours libre ?
    if (!availableSlots(date, service).includes(toHHMM(start))) {
      return res.status(409).json({ error: 'Ce créneau vient d’être pris. Choisissez-en un autre.' });
    }

    const end = start + service.duration;
    const id = crypto.randomBytes(9).toString('hex');
    const note = String(body.note || '').trim().slice(0, 500);
    const booking = {
      id, serviceId: service.id, serviceName: service.name, price: service.price,
      duration: service.duration, date, start, end, startLabel: toHHMM(start),
      name, phone, email, note,
      status: 'hold', holdExpires: Date.now() + HOLD_MINUTES * 60000,
      sessionId: null, createdAt: new Date().toISOString(),
    };

    // Mode démo : on confirme directement (aucun encaissement).
    if (DEMO) {
      booking.status = 'confirmed';
      const list = readBookings(); list.push(booking); writeBookings(list);
      return res.json({ url: '/success.html?booking=' + id + '&demo=1', demo: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY, unit_amount: service.price * 100,
          product_data: {
            name: SALON.name + ' — ' + service.name,
            description: 'RDV le ' + date + ' à ' + toHHMM(start) + ' · ' + service.duration + ' min',
          },
        },
      }],
      metadata: { bookingId: id, serviceId: service.id, date, start: String(start) },
      success_url: BASE_URL + '/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: BASE_URL + '/#rdv',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    booking.sessionId = session.id;
    const list = readBookings(); list.push(booking); writeBookings(list);
    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error', err.message);
    res.status(500).json({ error: 'Paiement indisponible. Réessayez.' });
  }
});

// ---------- Confirmer un blocage après paiement ----------
function confirmBySession(sessionId, customer) {
  const list = readBookings();
  const b = list.find((x) => x.sessionId === sessionId);
  if (!b) return null;
  if (b.status !== 'confirmed') {
    b.status = 'confirmed';
    if (customer && customer.email && !b.email) b.email = customer.email;
    writeBookings(list);
  }
  return b;
}

function publicBooking(b) {
  return {
    id: b.id, serviceName: b.serviceName, price: b.price, duration: b.duration,
    date: b.date, startLabel: b.startLabel, name: b.name, phone: b.phone,
    email: b.email, note: b.note, status: b.status,
    salon: { name: SALON.name, address: SALON.address, phone: SALON.phone, mapsUrl: SALON.mapsUrl },
  };
}

app.get('/api/booking', async (req, res) => {
  try {
    // Démo : lecture directe par id (aucun paiement).
    if (DEMO && req.query.demo === '1') {
      const b = readBookings().find((x) => x.id === String(req.query.booking));
      if (!b) return res.status(404).json({ error: 'Réservation introuvable.' });
      return res.json(Object.assign({ demo: true }, publicBooking(b)));
    }
    const sessionId = req.query.session_id;
    if (!sessionId || !stripe) return res.status(400).json({ error: 'Session manquante.' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Paiement non confirmé.' });
    const b = confirmBySession(session.id, session.customer_details);
    if (!b) return res.status(404).json({ error: 'Réservation introuvable.' });
    res.json(publicBooking(b));
  } catch (err) {
    console.error('booking error', err.message);
    res.status(500).json({ error: 'Impossible de récupérer votre réservation.' });
  }
});

// ---------- Site statique ----------
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(SALON.name + ' sur ' + BASE_URL + (DEMO ? '  [DÉMO — pas de clé Stripe]' : '  [Stripe actif]'));
});

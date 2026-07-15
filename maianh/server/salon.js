// Mai Anh Nails — source unique des données du salon.
// Modifiez ce fichier pour changer les prestations, prix, durées et horaires.
// Aucune donnée sensible ici : tout est public (affiché sur le site).

const SALON = {
  name: 'Mai Anh Nails',
  tagline: 'Manucure, pose gel & semi-permanent — Paris 17e',
  address: '72 Rue Boursault, 75017 Paris',
  addressShort: '72 Rue Boursault, 75017',
  phone: '+33 1 00 00 00 00',        // ← à renseigner (numéro du salon)
  email: 'contact@maianhnailsparis.fr',
  instagram: 'maianhnailsparis',      // handle Instagram (sans @)
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mai+Anh+Nails+72+Rue+Boursault+75017+Paris',
  timezone: 'Europe/Paris',
  // Nombre de postes (manucures pouvant travailler en parallèle).
  // Deux clientes peuvent réserver le même créneau tant que capacity n'est pas dépassée.
  capacity: 2,
};

// Horaires d'ouverture par jour (0 = dimanche … 6 = samedi).
// open/close en minutes depuis minuit (600 = 10:00, 1140 = 19:00). null = fermé.
const HOURS = {
  0: null,                     // dimanche — fermé
  1: { open: 600, close: 1140 }, // lundi   10:00–19:00
  2: { open: 600, close: 1140 }, // mardi
  3: { open: 600, close: 1140 }, // mercredi
  4: { open: 600, close: 1170 }, // jeudi   10:00–19:30
  5: { open: 600, close: 1170 }, // vendredi
  6: { open: 570, close: 1140 }, // samedi   9:30–19:00
};

// Pas de la grille de créneaux, en minutes (créneaux toutes les 15 min).
const SLOT_STEP = 15;

// Combien de jours à l'avance on peut réserver.
const BOOKING_WINDOW_DAYS = 45;

// Délai minimum avant un RDV (on ne propose pas un créneau dans moins de X minutes).
const MIN_LEAD_MIN = 60;

// Prestations, regroupées par catégorie. `price` en euros, `duration` en minutes.
// `deposit` (optionnel) : si le paiement en ligne est un acompte, montant en euros.
// Par défaut le paiement en ligne = prix total (aucune commission d'intermédiaire).
const CATEGORIES = [
  {
    id: 'semi',
    title: 'Semi-permanent',
    desc: 'Vernis longue tenue, brillance jusqu’à 3 semaines.',
    services: [
      { id: 'semi-mains', name: 'Pose semi-permanent — mains', price: 35, duration: 45 },
      { id: 'semi-pieds', name: 'Pose semi-permanent — pieds', price: 40, duration: 45 },
      { id: 'semi-french', name: 'Semi-permanent French / babyboomer', price: 45, duration: 60 },
      { id: 'depose-semi', name: 'Dépose semi-permanent + soin', price: 12, duration: 20 },
    ],
  },
  {
    id: 'gel',
    title: 'Gel & capsules',
    desc: 'Rallongement et renfort pour des ongles impeccables.',
    services: [
      { id: 'gel-pose', name: 'Pose gel sur ongles naturels', price: 50, duration: 90 },
      { id: 'gel-capsules', name: 'Pose gel + capsules (rallongement)', price: 60, duration: 105 },
      { id: 'gel-remplissage', name: 'Remplissage gel', price: 45, duration: 75 },
      { id: 'depose-gel', name: 'Dépose gel + soin', price: 18, duration: 30 },
    ],
  },
  {
    id: 'manucure',
    title: 'Manucure & soins',
    desc: 'Soin des mains, cuticules et vernis classique.',
    services: [
      { id: 'manu-simple', name: 'Manucure classique + vernis', price: 25, duration: 30 },
      { id: 'manu-russe', name: 'Manucure russe (à la machine)', price: 40, duration: 60 },
      { id: 'beaute-pieds', name: 'Beauté des pieds complète', price: 40, duration: 60 },
    ],
  },
  {
    id: 'deco',
    title: 'Nail art & déco',
    desc: 'À ajouter à une pose. Sur devis pour les designs complexes.',
    services: [
      { id: 'nailart-forfait', name: 'Nail art — forfait (2 ongles déco)', price: 10, duration: 15 },
      { id: 'nailart-full', name: 'Nail art — 10 ongles', price: 25, duration: 30 },
      { id: 'strass', name: 'Strass / bijoux d’ongles', price: 8, duration: 10 },
    ],
  },
];

// Index plat { id -> service } pour les recherches côté serveur.
const SERVICE_INDEX = {};
CATEGORIES.forEach((cat) => {
  cat.services.forEach((s) => {
    SERVICE_INDEX[s.id] = Object.assign({ categoryId: cat.id, categoryTitle: cat.title }, s);
  });
});

function findService(id) {
  return SERVICE_INDEX[id] || null;
}

// Version publique (identique ici, mais isole ce qui part au navigateur).
function publicCatalogue() {
  return {
    salon: {
      name: SALON.name, tagline: SALON.tagline, address: SALON.address,
      addressShort: SALON.addressShort, phone: SALON.phone, email: SALON.email,
      instagram: SALON.instagram, mapsUrl: SALON.mapsUrl,
    },
    categories: CATEGORIES,
  };
}

module.exports = {
  SALON, HOURS, SLOT_STEP, BOOKING_WINDOW_DAYS, MIN_LEAD_MIN,
  CATEGORIES, findService, publicCatalogue,
};

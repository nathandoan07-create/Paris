// SERVER-ONLY data. The exact address and access code/key live here and are NEVER
// sent to the browser except by /api/unlock, after Stripe confirms the payment.
// This is the single source of truth for the secret fields.

// Each rooftop sells max 3 groups (= 3 accès max). `price` is per group, `left`
// is the number of groups still available (0–3).
const ZONES = [
  { id: "bosquet-ter", name: "Toit Bosquet", area: "Champ-de-Mars (7e)", lat: 48.8600, lng: 2.3022, radius: 120,
    price: 230, capacity: 3, left: 3, stars: 5, view: "Vue Tour Eiffel",
    desc: "Toit haut de gamme à deux pas du Champ-de-Mars, plein axe sur la Tour.",
    tags: ["Assises"], address: "14 ter avenue Bosquet, 75007 Paris", access: { method: "Code", value: "7520", note: "" } },
  { id: "duvivier", name: "Toit École Militaire", area: "École Militaire (7e)", lat: 48.8567, lng: 2.3047, radius: 115,
    price: 210, capacity: 3, left: 2, stars: 5, view: "Vue Tour Eiffel",
    desc: "Au plus près de la Tour, feu d'artifice quasiment à la verticale.",
    tags: ["Ambiance festive"], address: "7 rue Duvivier, 75007 Paris", access: { method: "Code", value: "1104", note: "" } },
  { id: "expo-10", name: "Toit Champ-de-Mars · I", area: "Gros-Caillou (7e)", lat: 48.8574, lng: 2.3038, radius: 110,
    price: 190, capacity: 3, left: 3, stars: 5, view: "Vue Tour Eiffel",
    desc: "Petite rue calme du 7e, vue dégagée sur l'esplanade et la Tour.",
    tags: ["Couvertures fournies"], address: "10 rue de l'Exposition, 75007 Paris", access: { method: "Clé", value: "PTT T10", note: "" } },
  { id: "expo-16", name: "Toit Champ-de-Mars · II", area: "Gros-Caillou (7e)", lat: 48.8571, lng: 2.3033, radius: 110,
    price: 190, capacity: 3, left: 1, stars: 5, view: "Vue Tour Eiffel",
    desc: "Toit voisin, même vue superbe sur la Tour, jauge réduite.",
    tags: ["Jauge réduite"], address: "16 rue de l'Exposition, 75007 Paris", access: { method: "Clé", value: "PTT T10", note: "" } },
  { id: "grenelle-176", name: "Toit Gros-Caillou", area: "Gros-Caillou (7e)", lat: 48.8603, lng: 2.3038, radius: 115,
    price: 180, capacity: 3, left: 3, stars: 4, view: "Vue dégagée sur la Tour",
    desc: "Belle hauteur côté Grenelle, panorama large vers la Tour Eiffel.",
    tags: ["Panorama"], address: "176 rue de Grenelle, 75007 Paris", access: { method: "Code", value: "7917", note: "" } },
  { id: "brey", name: "Toit Étoile · I", area: "Étoile (17e)", lat: 48.8759, lng: 2.2962, radius: 115,
    price: 160, capacity: 3, left: 2, stars: 4, view: "Vue Arc de Triomphe & Tour",
    desc: "À deux pas de l'Étoile, panorama sur l'ouest parisien et le feu d'artifice.",
    tags: ["Photogénique"], address: "5 rue Brey, 75017 Paris", access: { method: "Code", value: "7520", note: "" } },
  { id: "macmahon", name: "Toit Étoile · II", area: "Étoile (17e)", lat: 48.8748, lng: 2.2952, radius: 115,
    price: 150, capacity: 3, left: 3, stars: 4, view: "Vue sur l'Étoile",
    desc: "Toit sur l'avenue Mac-Mahon, vue dégagée vers l'Arc et la Tour au loin.",
    tags: ["Vue ouest"], address: "1 avenue Mac-Mahon, 75017 Paris", access: { method: "Code", value: "7520", note: "Cadenas à enlever" } },
  { id: "duguay", name: "Toit Montparnasse", area: "Montparnasse (6e)", lat: 48.8466, lng: 2.3296, radius: 120,
    price: 140, capacity: 3, left: 3, stars: 4, view: "Vue vers la Tour Eiffel",
    desc: "Rive gauche, hauteur dégagée avec la Tour Eiffel en ligne de mire.",
    tags: ["Calme"], address: "19 rue Duguay-Trouin, 75006 Paris", access: { method: "Code", value: "7520", note: "" } },
  { id: "bergere", name: "Toit Grands Boulevards", area: "Grands Boulevards (9e)", lat: 48.8722, lng: 2.3443, radius: 120,
    price: 120, capacity: 3, left: 1, stars: 4, view: "Panorama & feu au loin",
    desc: "Grand toit central, vue sur les toits de Paris et le ciel du feu d'artifice.",
    tags: ["Central", "Ambiance festive"], address: "25 rue Bergère, 75009 Paris", access: { method: "Code", value: "1104", note: "" } },
  { id: "cretet", name: "Toit Pigalle", area: "Pigalle (9e)", lat: 48.8828, lng: 2.3388, radius: 120,
    price: 110, capacity: 3, left: 3, stars: 4, view: "Vue hauteurs de Paris",
    desc: "Sur les hauteurs du 9e, panorama ouvert sur la ville en fête.",
    tags: ["Rooftop"], address: "3 rue Crétet, 75009 Paris", access: { method: "Code", value: "7520", note: "Deuxième porte à ouvrir" } },
  { id: "grenelle-155", name: "Toit Gros-Caillou · II", area: "Gros-Caillou (7e)", lat: 48.8607, lng: 2.3060, radius: 115,
    price: 180, capacity: 3, left: 0, stars: 4, view: "Vue Tour Eiffel", status: "pending",
    desc: "Nouveau toit en cours de validation — bientôt disponible à la réservation.",
    tags: ["Bientôt"], address: "155 rue de Grenelle, 75007 Paris", access: { method: "Code", value: "à confirmer", note: "Accès en cours de vérification" } }
];

// Pass intégral: one payment unlocks every bookable rooftop. Adjust the price here.
const PASS = { id: "pass", label: "Pass intégral", price: 390 };

// Public projection: everything EXCEPT the exact address and the access value.
// accessMethod / accessNote are safe to expose (they don't reveal the building).
function toPublic(z) {
  return {
    id: z.id, name: z.name, area: z.area, lat: z.lat, lng: z.lng, radius: z.radius,
    price: z.price, capacity: z.capacity, left: z.left, stars: z.stars, view: z.view,
    desc: z.desc, tags: z.tags, status: z.status || "available",
    accessMethod: z.access.method, accessNote: z.access.note || ""
  };
}

const publicZones = () => ZONES.map(toPublic);
const findZone = (id) => ZONES.find((z) => z.id === id);
const isSellable = (z) => (z.status || "available") !== "pending" && z.left > 0;

module.exports = { ZONES, PASS, publicZones, findZone, isSellable };

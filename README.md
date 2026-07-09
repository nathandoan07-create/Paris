# Paname Roof

Site de réservation de places sur des terrasses privées pour le feu d'artifice
du 13 juillet à Paris. Carte interactive, sélection de zone, **paiement Stripe**,
et révélation de l'adresse + de l'accès **uniquement après paiement confirmé**.

## Architecture

- `index.html` — le site (carte Leaflet, zones, feux d'artifice, tunnel de paiement).
  Ne contient **aucune** adresse ni code d'accès.
- `success.html` — page de retour après paiement ; appelle `/api/unlock`.
- `server/` — backend Express :
  - `zones.js` — **source unique** des données, y compris les adresses et codes (jamais envoyés au navigateur avant paiement).
  - `server.js` — sert le site + API Stripe.

## Sécurité (important)

Les adresses et codes d'accès vivent **seulement côté serveur** (`server/zones.js`).
Ils ne sont renvoyés au navigateur que par `/api/unlock`, après que Stripe a
confirmé le paiement (`payment_status === 'paid'`). Ne remettez jamais ces
données dans `index.html`.

## Lancer en local

```bash
cd server
npm install
cp .env.example .env      # puis renseignez vos clés Stripe (test d'abord)
npm start                 # http://localhost:4242
```

### Mode démo (sans clés Stripe)

Si `STRIPE_SECRET_KEY` n'est pas défini, le serveur démarre en **mode démo** :
le tunnel de paiement fonctionne de bout en bout mais **sans encaissement**
(la page de succès révèle l'accès sans paiement). Dès qu'une clé Stripe est
présente, le mode démo est automatiquement désactivé et le paiement est exigé.

### Mode réel (Stripe)

1. Créez un compte sur https://dashboard.stripe.com et récupérez vos clés **test** (`sk_test_...`).
2. Renseignez `STRIPE_SECRET_KEY` dans `server/.env`.
3. (Recommandé) Webhook pour l'e-mail de confirmation :
   ```bash
   stripe listen --forward-to localhost:4242/api/webhook
   ```
   puis mettez le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.
4. Testez avec la carte `4242 4242 4242 4242`, date future, CVC quelconque.

## Réglages rapides

- **Prix du Pass intégral** : `server/zones.js` → `const PASS = { ... price: 390 }`.
- **Prix / jauge / accès d'une terrasse** : `server/zones.js` (les mêmes champs
  publics — nom, prix, vue… — sont dupliqués dans `index.html` pour l'affichage).

## À faire ensuite

- Envoi de l'e-mail de confirmation avec l'adresse (dans le webhook `checkout.session.completed`).
- Décompte réel des places (`left`) après paiement.
- Déploiement (Render, Railway, Fly.io…) avec les variables d'environnement.

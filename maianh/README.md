# Mai Anh Nails

Site vitrine + **prise de rendez-vous** avec **paiement Stripe** pour le salon de
manucure **Mai Anh Nails**, 72 Rue Boursault, 75017 Paris.

Objectif : réserver et encaisser **en direct**, sans passer par Treatwell ni
Planity — donc **sans commission**.

> Ce dossier est **indépendant** du site « rooftop » à la racine du dépôt. Les deux
> peuvent coexister et se déployer séparément.

## Ce que fait le site

- **Présentation** : accueil, prestations & prix, galerie, à propos, avis, infos & accès (plan).
- **Prise de RDV en 4 étapes** : prestation → date & créneau → coordonnées → paiement.
- **Créneaux calculés côté serveur** à partir des horaires du salon, de la durée de
  chaque soin et du nombre de postes (`capacity`), avec anti-double-réservation.
- **Paiement carte sécurisé** via Stripe Checkout. Le créneau est bloqué le temps du
  paiement, puis confirmé une fois le paiement vérifié.

## Architecture

- `index.html` — le site (présentation + tunnel de RDV).
- `success.html` — page de confirmation après paiement ; appelle `/api/booking`.
- `server/`
  - `salon.js` — **source unique** des données : infos salon, horaires, prestations, prix, durées.
  - `server.js` — sert le site + API (catalogue, disponibilités, Stripe, confirmation).
  - `bookings.json` — réservations (créé automatiquement ; ignoré par git).

## Lancer en local

```bash
cd maianh/server
npm install
cp .env.example .env      # puis renseignez vos clés Stripe (test d'abord)
npm start                 # http://localhost:4321
```

### Mode démo (sans clés Stripe)

Si `STRIPE_SECRET_KEY` n'est pas défini, le serveur démarre en **mode démo** : le
tunnel fonctionne de bout en bout mais **sans encaissement** (le RDV est confirmé
directement). Dès qu'une clé Stripe est présente, le mode démo se désactive et le
paiement réel est exigé.

### Mode réel (Stripe)

1. Créez un compte sur https://dashboard.stripe.com et récupérez vos clés **test** (`sk_test_...`).
2. Renseignez `STRIPE_SECRET_KEY` dans `server/.env`.
3. (Recommandé) Webhook pour fiabiliser la confirmation :
   ```bash
   stripe listen --forward-to localhost:4321/api/webhook
   ```
   puis mettez le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`.
4. Testez avec la carte `4242 4242 4242 4242`, date future, CVC quelconque.

## Personnaliser le salon

Tout se règle dans **`server/salon.js`** :

- **Coordonnées** : `SALON` (téléphone, e-mail, Instagram…). Pensez à mettre le vrai **numéro de téléphone**.
- **Horaires** : `HOURS` (par jour, en minutes depuis minuit ; `null` = fermé).
- **Postes en parallèle** : `SALON.capacity` (2 par défaut).
- **Prestations / prix / durées** : `CATEGORIES`.
- **Fenêtre de réservation / délai mini** : `BOOKING_WINDOW_DAYS`, `MIN_LEAD_MIN`.

Les **avis** de la page d'accueil sont des exemples à remplacer par vos vrais avis
Google (section `#avis` dans `index.html`). Idem pour la **galerie** : remplacez les
tuiles dégradées par vos photos.

## Déploiement sur Render

Le dossier contient `maianh/render.yaml`. Étapes :

1. Sur https://render.com : **New → Blueprint**, choisissez ce dépôt.
2. Indiquez le blueprint `maianh/render.yaml` (service **mai-anh-nails**, `rootDir: maianh/server`).
3. Dans **Environment**, ajoutez :
   - `STRIPE_SECRET_KEY` = `sk_test_...` (puis `sk_live_...` en production).
   - (option) `STRIPE_WEBHOOK_SECRET` = `whsec_...` une fois le webhook créé.
4. **Deploy**. Le site sera en ligne sur l'URL affichée par Render.
5. **Webhook Stripe** (recommandé) : Dashboard Stripe → Développeurs → Webhooks →
   *Add endpoint* → URL `https://<votre-url>/api/webhook`, événement
   `checkout.session.completed`. Copiez le `whsec_...` dans Render, puis redéployez.

> Le plan gratuit Render met le service en veille après inactivité (premier
> chargement un peu lent). Un plan payant supprime cette mise en veille.

## Limites connues / pistes

- `bookings.json` est un fichier local : sur le plan gratuit Render, le disque est
  **éphémère** (réservations perdues à chaque redéploiement/veille). Pour de la
  production durable, brancher une vraie base (SQLite persistant, Postgres…) ou
  Google Calendar. La couche de stockage est isolée dans `server.js` (fonctions
  `readBookings`/`writeBookings`).
- Pas d'e-mail de confirmation automatique pour l'instant (piste : Resend/Stripe).
- Le RDV est réglé **en totalité** en ligne. Pour un **acompte**, ajustez le montant
  du `line_item` dans `server.js`.

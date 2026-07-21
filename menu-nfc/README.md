# TapMenu — Menu digital par puce NFC

Vitrine commerciale d'un système de **menu de restaurant sans contact** : une puce
NFC posée sur la table, le client l'approche de son téléphone, le menu s'ouvre
(sans application, sans QR code à cadrer).

## Ce que contient la démo

- **Page d'accueil** : présentation du concept + une grille de **styles de
  restaurant** (Italien, Asiatique, Bar/Brasserie, Africain, Indien, Gastronomie
  française, Japonais, Libanais/Oriental, Mexicain, Burger/Street food,
  Végé/Vegan, Café/Brunch).
- **Menu démo par style** : un clic sur un style ouvre un **exemple de menu
  complet** (entrées, plats, desserts, prix, tags végé/épicé/signature), thématisé
  aux couleurs et à la typographie du type de restaurant — exactement ce que le
  client verrait après avoir tapé la puce.
- Barre d'actions démo : « Appeler le serveur » / « Demander l'addition ».

## Lancer / voir le site

C'est un site **100 % statique**, un seul fichier `index.html`. Aucune
installation.

```bash
# Ouvrir directement le fichier dans un navigateur, ou servir le dossier :
cd menu-nfc
python3 -m http.server 8000
# puis http://localhost:8000
```

Lien direct vers un menu : ajoutez `#menu-<id>` à l'URL, par exemple
`index.html#menu-italien` ou `#menu-japonais`.

## Mettre en ligne sur Render (lien ouvrable)

Le dépôt contient un blueprint `render.yaml` qui déclare **deux services** :
`paname-roof` (l'ancien projet, inchangé) et **`tapmenu`** (ce site statique).

### Option A — la plus simple : « New → Static Site »

1. Va sur https://render.com et connecte ton compte GitHub.
2. **New → Static Site**, choisis le dépôt `nathandoan07-create/Paris`.
3. Renseigne :
   - **Branch** : `claude/session-dbhalc` (ou `main` après fusion).
   - **Build Command** : *(laisse vide)*
   - **Publish Directory** : `menu-nfc`
4. **Create Static Site**. En ~1 minute tu obtiens un lien du type
   `https://tapmenu.onrender.com` — **ouvrable et partageable**.

### Option B — via le Blueprint (déploie les deux projets d'un coup)

1. Sur Render : **New → Blueprint**, choisis le dépôt et la branche.
2. Render lit `render.yaml` et crée les services `paname-roof` **et** `tapmenu`.
3. Le service `tapmenu` te donne l'URL publique du menu.

> 💡 C'est un site **statique** : pas de mise en veille, chargement rapide, et
> le plan gratuit suffit. Les photos des plats se chargent depuis internet
> (comme dans n'importe quel site) ; le visiteur a juste besoin d'une connexion.

## Personnaliser

Toutes les données (restaurants, plats, prix, couleurs de chaque style) sont
dans le tableau `CUISINES` en bas de `index.html`. Pour un vrai déploiement,
chaque puce NFC pointerait vers le menu personnalisé d'un restaurant précis.

## Étapes suivantes possibles

- Tableau de bord pour que le restaurateur modifie son menu en temps réel.
- Un menu par restaurant relié à l'URL encodée dans chaque puce NFC.
- Multilingue, photos des plats, paiement à table.

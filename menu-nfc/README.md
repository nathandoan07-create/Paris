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

## Personnaliser

Toutes les données (restaurants, plats, prix, couleurs de chaque style) sont
dans le tableau `CUISINES` en bas de `index.html`. Pour un vrai déploiement,
chaque puce NFC pointerait vers le menu personnalisé d'un restaurant précis.

## Étapes suivantes possibles

- Tableau de bord pour que le restaurateur modifie son menu en temps réel.
- Un menu par restaurant relié à l'URL encodée dans chaque puce NFC.
- Multilingue, photos des plats, paiement à table.

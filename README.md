# SOS Animal – Premiers secours pour animaux

Application web (installable sur mobile) pour aider les propriétaires d'animaux à savoir **comment réagir quand leur animal a un problème** :

- **Diagnostic guidé** : choix de l'animal (chien, chat, lapin/rongeur) puis du problème, vérification des signes de gravité, puis quelques questions oui/non. Le résultat donne un niveau d'urgence :
  - 🔴 **Urgence** : appeler un vétérinaire et partir maintenant ;
  - 🟠 **Consultation rapide** : voir un vétérinaire dans la journée ;
  - 🟢 **Surveillance** : soins à la maison et signes à surveiller.

  Chaque résultat indique **que faire**, **ce qu'il ne faut pas faire**, les gestes utiles, et un **résumé copiable à transmettre au vétérinaire**.
- **Gestes de premiers secours** : réanimation, étouffement, constantes normales, transport, muselière, pansement, convulsions, coup de chaleur, trousse de secours.
- **Toxiques** : aliments, plantes et produits dangereux, avec recherche.
- **Urgences** : centres antipoison vétérinaires et numéro de votre vétérinaire (enregistré uniquement sur l'appareil) pour l'appeler en un geste.

Problèmes couverts : vomissements/diarrhée, intoxication, respiration/étouffement, plaies et saignements, chute/accident/boiterie, coup de chaleur, convulsions, torsion d'estomac, problèmes urinaires, troubles digestifs du lapin, perte d'appétit, piqûres/chenilles/vipère/crapaud/tiques, yeux, brûlures.

> ⚠️ L'application donne une orientation et des conseils de premiers secours. Elle ne pose pas de diagnostic et ne remplace jamais l'avis d'un vétérinaire. Le contenu doit être relu par un vétérinaire avant une mise en production.

## Lancer

Aucune dépendance ni compilation. Ouvrez `index.html` dans un navigateur, ou servez le dossier :

```sh
python3 -m http.server 8000   # puis http://localhost:8000
```

Servie en HTTPS (GitHub Pages, Netlify…), l'application fonctionne hors ligne et peut être ajoutée à l'écran d'accueil.

## Structure

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page unique, en-tête et navigation |
| `js/data.js` | **Tout le contenu** : parcours, fiches, toxiques, contacts |
| `js/app.js` | Moteur du diagnostic et affichage des pages |
| `css/style.css` | Styles (mobile d'abord, thème sombre automatique) |
| `sw.js`, `manifest.webmanifest` | Mode hors ligne et installation |
| `tests/validate.js` | Vérifie la cohérence des parcours |

## Ajouter ou modifier un parcours

Dans `js/data.js`, chaque entrée de `SYMPTOMS` contient un nœud de départ (`start`) et des nœuds :

```js
maQuestion: {
  q: "Texte de la question ?",
  help: "Aide facultative",
  answers: [
    { label: "Oui", next: "monResultat" },
    { label: "Non", next: "autreQuestion" },
  ],
},
monResultat: {
  level: "urgence", // ou "rapide", "surveiller"
  title: "…", summary: "…",
  actions: ["…"], avoid: ["…"], watch: ["…"], fiches: ["transport"],
},
```

`next: "vital"` renvoie vers le résultat commun d'urgence vitale. Après modification :

```sh
node tests/validate.js
```

Le test signale les liens cassés, les boucles, les nœuds jamais atteints et les fiches inconnues.

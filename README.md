# 🎹 Ma Piano — apprendre le piano, avec une appli qui t'écoute

Une appli (PWA) pour apprendre le piano **sur ton vrai piano** : tu poses le téléphone ou la tablette sur le
pupitre, l'appli **écoute** ce que tu joues avec le micro, et te dit si c'est juste ou faux — à la manière de
Simply Piano. Elle marche aussi avec les touches de l'écran, sans micro. Tout tourne dans le navigateur :
aucun compte, aucun serveur, aucune donnée envoyée.

**Lien :** <https://cdricpl.github.io/Piano/> (une fois GitHub Pages activé : *Settings → Pages → branche `main`, dossier `/ (root)`*).
Sur téléphone : ouvre le lien, l'appli propose de s'installer (icône sur l'écran d'accueil, plein écran, hors connexion).

## Trois façons de jouer

| | |
|---|---|
| **Pas à pas** | Les notes à jouer s'allument en couleur (bleu = main droite, orange = main gauche) sur la partition **et** sur le clavier, avec le numéro du doigt. L'appli attend ta note, puis passe à la suivante. Une fausse note affiche « Tu as joué Fa — il faut Mi ». |
| **À tempo** | Décompte, métronome, la partition avance : chaque note doit tomber au bon moment. Score en %, étoiles. |
| **Écouter** | L'appli joue le morceau (piano de synthèse) en montrant les touches. |

**Mon micro** (accueil) : joue n'importe quoi, l'appli affiche les notes qu'elle entend (Do4, Fa♯3…), avec un
niveau sonore et un réglage de sensibilité. C'est l'endroit pour vérifier que l'écoute marche bien chez toi.

## Contenu

- **Parcours : 33 leçons en 5 niveaux** — trouver le Do, position de cinq doigts, valeurs de notes, silences,
  main gauche, gammes, accords majeurs et mineurs, dièses et bémols, basse d'Alberti, arpèges, canon de Pachelbel,
  rythmes pointés, Hanon, syncopes.
- **Exercices : 18** — gammes (Do, Sol, Fa, Ré, La, La mineur, Ré mineur), accords, arpèges, trilles, sauts d'octave.
- **Morceaux : 16**, par style puis par niveau :
  - *Comptines & chants* (domaine public) : Au clair de la lune, Frère Jacques, Jingle Bells, Joyeux anniversaire, Douce nuit ;
  - *Classiques* : Ode à la joie (deux mains), Canon en ré ;
  - *Pop* : Adele (Someone Like You, Hello, Rolling in the Deep), Coldplay (Clocks, Viva la Vida, The Scientist, Fix You) ;
  - *Rock* : My Chemical Romance (Helena) ; *Disney* : Libérée, délivrée.
- **Mes partitions** : importe un fichier **MIDI** (`.mid`) — une partition complète téléchargée ou exportée
  de MuseScore — et joue-la comme les autres morceaux, avec l'écoute du micro. Le fichier est converti sur
  l'appareil et y reste (rien n'est envoyé). La conversion arrondit les débuts de notes à la double croche et
  coupe les notes tenues à la barre de mesure ; deux pistes = main droite et main gauche, une seule piste =
  partage autour du Do central.
- **Acquis / À travailler** : deux boutons dans le lecteur marquent n'importe quel élément ; la page Progression
  les regroupe.

### À propos des chansons protégées

Les mélodies des chansons sous droits **ne sont pas reproduites**. Pour ces titres (Adele, Coldplay, Disney, MCR),
l'appli propose l'**accompagnement de toute la chanson**, partie par partie (intro, couplets, pré-refrain,
refrains, pont, fin) : la suite d'accords et la basse, en arpèges ou en accords, dans la tonalité de
l'enregistrement. Ce n'est pas une transcription : c'est de quoi jouer par-dessus l'enregistrement ou chanter.
Les accords viennent de grilles publiques ; le nombre de passages de chaque partie est approximatif
(*« à vérifier à l'oreille »*). Pour une partition note pour note, utilise **Mes partitions** (import MIDI).
Les airs traditionnels (Ode à la joie, Douce nuit, etc.) sont joués note pour note.

## Comment l'appli écoute (et ses limites)

Pas d'IA, pas de réseau : du traitement du signal dans le navigateur (`js/ecoute.js`).

1. Le micro est analysé par FFT (8192 points, ≈ 170 ms) ; l'annulation d'écho et la réduction de bruit du
   navigateur sont coupées (elles abîment la musique).
2. Pour chaque note du clavier (Mi2 → Do7), une **saillance** : énergie du fondamental et des premiers
   harmoniques, comparée au bruit de fond de la pièce.
3. On retient la note la plus saillante, on **efface ses harmoniques** du spectre, on recommence : les harmoniques
   ne sont pas prises pour des notes en plus.
4. Une **attaque** = la saillance d'une note remonte d'un coup. Elle distingue deux fois la même note, et ignore
   la résonance de la note précédente.

Mesuré sur des enregistrements de piano synthétiques (`outils/synthese_piano.py`, `outils/test_ecoute.mjs`,
et un test de bout en bout avec Chromium qui reçoit ces enregistrements comme micro) : les 86 frappes de
test (notes seules, graves, aigus, répétées, accords, octaves) sont retrouvées ; 26 sur 27 dans une pièce dix fois
plus bruyante (seul un Do3 grave est manqué) ; aucune fausse note n'est signalée sur la gamme.

**À savoir :**
- Ces tests sont faits avec des sons **synthétiques**. Sur un vrai piano droit, avec la vraie acoustique d'une
  pièce, les résultats peuvent différer : utilise **Mon micro** pour vérifier, et le réglage de **sensibilité**
  (Réglages) pour ajuster.
- Les octaves sont jugés avec **indulgence** : jouer Do4 quand Do5 est attendu est accepté (la même note).
- Deux notes voisines dans le grave (en dessous de Sol3) se confondent ; les tout premiers graves (Mi2–Fa2)
  sont faibles sur un micro de téléphone.
- Avec le métronome en mode « À tempo », le haut-parleur est entendu par le micro : préfère des écouteurs, ou
  coupe le métronome dans les Réglages.
- Une « fausse note » n'est signalée que si elle est franche ; elle peut arriver ≈ 0,5 s après la frappe.
- Pas (encore) de clavier MIDI.

## Fabriquer / publier

Aucune dépendance : JavaScript natif (modules ES), aucun outil de compilation nécessaire.

- Le dépôt se publie tel quel (GitHub Pages) : `index.html` charge `js/app.js` et ses modules.
- `node build.js` → `ma-piano.html` : tout l'appli en **un seul fichier** à double-cliquer ;
  `node build.js --artefact` : variante pour une page hébergée.
- `node outils/test_ecoute.mjs <dossier>` : teste l'analyseur sur les WAV produits par
  `python3 outils/synthese_piano.py <dossier>` (nécessite `numpy`).
- `node outils/audit_lisibilite.mjs [--captures] [--taille=nom,…]` : parcourt tous les écrans sur 23 tailles
  (petit téléphone tenu droit ou couché → écran de bureau) et signale tout texte coupé, débordant ou trop petit
  (nécessite `playwright-core` et un Chromium).
- `python3 outils/extraire_glyphes.py NotoMusic-Regular.ttf` regénère `js/glyphes.js` (clés de sol et de fa,
  altérations…), extraits de la police **Noto Music** (SIL Open Font License).
- `node outils/generer_icones.mjs` fabrique les icônes depuis `icons/icone.svg`.

## Les fichiers

```
index.html            la page (accueil, listes, lecteur, « Mon micro »)
css/styles.css        le style (thème clair, cartes en dégradé, clavier, partition)
js/notes.js           notes, tonalités, format compact des morceaux (d:'C4:1@1 D4 E4 | …')
js/partition.js       partition à défilement : clé de sol/fa, armure, silences, liaisons, doigtés
js/clavier.js         clavier à l'écran (touches cibles, doigts, notes entendues, jeu au doigt)
js/son.js             piano de synthèse (Web Audio) et métronome
js/ecoute.js          l'écoute du micro : notes, attaques
js/jeu.js             pas à pas, à tempo, démonstration
js/lecons.js          les 33 leçons          js/exercices.js   les 18 exercices
js/morceaux.js        les morceaux           js/airs.js        les airs du domaine public
js/midi.js            import d'un fichier MIDI (lecture, conversion au format compact)
js/illustrations.js   les petits dessins     js/progress.js    la progression (localStorage)
js/app.js             l'assemblage : écrans, navigation, réglages
```

Écrire un morceau : deux chaînes, une par main. `C4:1@1` = Do4, 1 temps, doigt 1 ; `C4+E4+G4:4` = accord de
4 temps ; `r:2` = silence de 2 temps ; `|` sépare les mesures (vérifié à la compilation) ;
`(C4 E4 G4 E4)*2` répète un groupe.

---

La même famille que [Ma Batterie](https://github.com/Cdricpl/batterie-) : mêmes écrans, même progression
« Acquis / À travailler », mêmes outils de contrôle de lisibilité.

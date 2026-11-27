# Qui gagne la présidentielle ?

Jeu de fusion physique (HTML5 + Matter.js), format 9:16 pour téléphone.

- `index.html` : la page du jeu
- `js/game.js` : tout le jeu. **La liste des candidats est en haut du fichier** (tableau `CANDIDATS`).
- `js/matter.min.js` : moteur physique (inclus, aucune connexion nécessaire)
- `sounds/` : mp3 optionnels pour remplacer les sons générés (voir `sounds/LISEZ-MOI.txt`)

Modes : **Jouer** (glisser pour viser, relâcher pour lâcher) et **Mode vidéo** (partie automatique,
aucun bouton ; double-tap pour revenir à l'accueil).

Astuce de test : `index.html?speed=3` accélère la partie.

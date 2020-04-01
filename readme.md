# Piccadilly Game

Projet Tutoré - IUT Nancy Charlemagne 2019-2020

- Tom Georgelin [@totomdotcom](https://github.com/totomdotcom)
- Martin Jossic [@daiSKeul](https://github.com/daiSKeul)
- Matéo Achterfeld [@Achterfeld](https://github.com/Achterfeld)
- Guillaume Keller [@GPaddle](https://github.com/GPaddle)

## Philosophie du projet :

> Durant un voyage à Londres, j'ai vu Piccadilly Circus, et je n'ai pas pu m'empêcher de réfléchir à la manière dont les passants pourraient interagir avec les pubs. Le jeu me paraissait être la meilleure approche.

Avec cette brève introduction, notre tuteur nous a lancés sur une plateforme de jeu massivement jouable et facilement accessible (via un navigateur).

## Technologies :
	
- [x] HTML
- [x] CSS
- [x] JS
- [x] Node.Js

## Documentation

Les étapes d'installation sont détaillées ci-dessous. Pour ce qui est du code, il est entièrement commenté donc il n'y a pas de documentation du code (en dehors de lui-même).

### Fichier `conf/conf.json`

Le fichier de configuration `conf/conf.json` contient les champs suivants :
- `game` : permet de choisir le jeu à charger
- `liste des jeux...` : c'est une option "commentaire" qui est juste là pour indiquer quels sont les jeux qu'on peut charger avec l'option `game`
- `minPlayer` : nombre minimal de joueurs nécessaire au lancement de la partie
- `startCountdownTime` : temps du compte à rebours avant le début de la partie
- `scoreCountdownTime` : temps pendant lequel les scores finaux sont affichés en fin de partie
- `port` : port sur lequel le serveur écoute
- `nbQuestions` : nombre de questions affichées par partie (les questions sont piochées dans le fichier `ressources/questions.json`), ce champ ne concerne bien sûr que le jeu de questions
- `testMode` : active ou non le mode de test qui permet de rendre une partie plus rapide, réservé aux développeurs

Le serveur doit être relancé pour tenir compte d'un changement dans le fichier de configuration.

### Fichier `ressources/questions.json`

Le fichier `ressources/questions.json` contient les différentes questions pouvant être affichées pendant une partie de jeu de questions. C'est un tableau d'objets JSON contenant les champs suivants :
 - `title` : intitulé de la question
 - `answers` : tableau des 4 réponses possibles, elles seront affichées dans l'ordre décrit dans ce fichier
 - `correctAnswer` : index de la bonne réponse dans le tableau `answers` écrit juste avant, la première réponse du tableau est la réponse `0`, la deuxième est la `1`...
 - `time` : temps en secondes dont les joueurs disposent pour répondre à cette question

### Fichier `ressources/pseudos.json`

Le fichier `ressources/pseudos.json` contient les noms et adjectifs nécessaires à la génération des pseudos aléatoires proposés aux joueurs lorsqu'ils se connectent. Le tableau `names` contient les premières parties des pseudos et le tableau `adjectives` contient les secondes parties des pseudos. Un pseudo est généré en concaténant un `name` et un `adjective` pris au hasard dans ce fichier.

### Installation :

Pour héberger l'application, vous devez installer Node.Js.

Une fois cela fait, clonez le dépôt, ouvrez un terminal à la racine de celui-ci et tapez ceci pour installer la bibliothèque WebSocket dont le projet dépend :
```bash
cd code
npm install
```

Créez ensuite le fichier de configuration grâce à l'exemple fourni :
```bash
cd conf
cp example-conf.json conf.json
```

Vous pouvez maintenant lancer le serveur (tapez bien cette commande depuis le dossier code et non depuis le dossier server) :
```bash
node server/main.js
```

Le serveur se lance par défaut sur le port 80. Si vous avez une erreur à son lancement, réessayez avec les droits d'administrateur ou changez le port dans `conf/conf.json` avec un numéro supérieur ou égal à 1024 (les droits d'administrateur ne sont pas nécessaires pour lancer un serveur à partir du 1024ème port).

Une fois le serveur lancé, vous pouvez connecter un ou plusieurs écrans (faites le avant le début du compte à rebours de début de partie) en vous connectant sur http://adresse-du-serveur/screen

Les joueurs se connecteront sur http://adresse-du-serveur/play
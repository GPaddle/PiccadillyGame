**Piccadilly Game**

Projet Tutoré

@IUT Nancy Charlemagne 2019-2020

 - Tom Georgelin
 - Martin Jossic
 - Matéo Achterfeld
 - Guillaume Keller

## Philosophie du projet :

> Durant un voyage à Londres, j'ai vu Piccadilly Circus, et je n'ai pas pu m'empêcher de réfléchir à la manière dont les passants pourraient interagir avec les pubs. Le jeu me paraissait être la meilleure approche.

Avec cette brève introduction notre tuteur nous a lancé sur une plateforme de jeu, massivement jouable et facilement accessible (via un navigateur).

## Technologies :
	
 - [x] HTML
 - [x] CSS
 - [x] JS
 - [x] Node Js

## Protocoles :

Les envois de données sont identifiés dans le code par des commentaire de type //REPERE {x}
ex : //REPERE 1
Chaque fichier comporte sa propre numérotation

 - **Protocole d'échange Ecran-> Serveur :** (screen.js)

Envois d'information à propos du client (state = WAIT_GAME_INFO) :
chercher "REPERE 1"

	[
		0 : CLIENT_TYPE_SCREEN,
	 	1 : SECRET_SCREEN_KEY
	 ]

 - **Protocole d'échange Joueur-> Serveur :** (play.js)


Envois du pseudo (state = ?) :
chercher "REPERE 1"

	[
		0 : valeur champ pseudo
	 ]

Envois d'information à propos du client (state = WAIT_GAME_INFO) :
chercher "REPERE 2"

	[
		0 : CLIENT_TYPE_PLAYER
	]

Envois de la réponse choisie  (state = WAIT_QUESTION_EVENT) :
chercher "REPERE 3"

	[
		0 : Réponse choisie
	]


 - **Protocole d'échange Serveur-> Joueurs :** (websocket.js)

 
Envois des questions (state = ?) :
chercher "REPERE 2"

	[
		0 : NEW_QUESTION,
		1 : durée de la question
	]
 
Envois des informations joueurs (state = WAIT_AUTH) :
chercher "REPERE 4"

	[
		0 : ADD_PLAYER,
		1 : player ID,
		2 : player pseudo
	]
 
Envois des informations sur le jeu (state = WAIT_AUTH) :
chercher "REPERE 4"

	[
		0 : MIN_PLAYER,
		1 : nombre de joueurs +1,
		2k+2 : player id,
		2k+3 : player pseudo,

		n-2 : dernier id ajouté
		n-1 : dernier pseudo ajouté
		n : rappel du dernier id
	]

Décompte pour le début du jeu (state = WAIT_AUTH) :
chercher "REPERE 5"

	[
		0 : START_GAME_COUNTDOWN
		1 : Durée du compte à rebours
	]

Début du jeu, affichage des informations spécifiques aux questions (state = WAIT_AUTH) :
chercher "REPERE 6"

	[
		0 : START_GAME
	]

Envois d'un nouveau joueur à tous les joueurs (state = WAIT_PSEUDO) :
chercher "REPERE 7"

	[
		0 : SET_PSEUDO,
		1 : id du nouveau joueur,
		2 : pseudo du nouveau joueur
	]

Envois des statistiques à tous les joueurs après avoir répondu (state = WAIT_ANSWER) :
chercher "REPERE 8"

	[
		0 : ANSWER_STATS,
		1 : statistiques de la réponse 1,
		2 : statistiques de la réponse 2,
		3 : statistiques de la réponse 3,
		4 : statistiques de la réponse 4
	]

Suppression d'un nouveau player  : 
chercher "REPERE 9"

	[
		0 : DEL_PLAYER,
		1 : id du joueur à retirer
	]


 - **Protocole d'échange Serveur-> Ecrans :**

Fin du jeu, affichage des scores (state = ?) :
chercher "REPERE 1" 

	[
		0 : END_GAME
		1 : nombre de joueurs 
		2n+2 : Pseudos d'un joueur
		2n+3 : Score d'un joueur
		...
	]

Envois des questions (state = ?) :
chercher "REPERE 2"

	[
		0 : NEW_QUESTION,
		1 : titre de la question,
		2 : Réponse 1,
		3 : Réponse 2,
		4 : Réponse 3,
		5 : Réponse 4,
		6 : Durée de la question,
	]

Envois d'un nouveau joueur (state = WAIT_AUTH) :
chercher "REPERE 4"

	[
		0 : ADD_PLAYER
	]


Décompte pour le début du jeu (state = WAIT_AUTH) :
chercher "REPERE 5"

	[
		0 : START_GAME_COUNTDOWN
		1 : Durée du compte à rebours
	]

Début du jeu, affichage des informations spécifiques aux questions (state = WAIT_AUTH) :
chercher "REPERE 6"

	[
		0 : START_GAME
	]

Suppression d'un nouveau player : 
chercher "REPERE 9"

	[
		0 : DEL_PLAYER
	]

Ajout d'un nouvel écran (state = WAIT_AUTH) : 
chercher "REPERE 10"

	[
		0 : MIN_PLAYER,
		1 : longeur de la liste de joueurs
	]


## Installation :

Pour utiliser l'application :

	installer node

Depuis le dossier `code` lancer l'application avec la commande
`node server/main.js` 

Depuis un écran d'affichage : se rendre sur la page d'URL :
`URLHébergé/CléSecrete/screen`

Depuis cette page, les joueurs auront accès par 2 moyens à l'application :

 - Un URL direct de type `URLHébergé/play`
 - Un QR Code qui y redirige

 

##  :


##  :


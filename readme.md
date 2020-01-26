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

 - **Protocole d'échange Joueur-> Serveur :**

Sérialisation des informations sous la forme :

	[
		0 : Type d'information,
	 	1 : ,
	 	2 : ,
	 	3 : ,
	 	...
	 ]


 - **Protocole d'échange Serveur-> Joueurs :**

 
Envois des questions :
chercher "REPERE 2"

	[
		0 : NEW_QUESTION,
		1 : durée de la question
	]
 
Envois des informations joueurs (Salle d'attente) :
chercher "REPERE 4"

	[
		0 : ADD_PLAYER,
		1 : player ID,
		2 : player pseudo
	]
 
Envois des informations sur le jeu :
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

Décompte pour le début du jeu :
chercher "REPERE 5"

	[
		0 : START_GAME_COUNTDOWN
		1 : Durée du compte à rebours
	]

Début du jeu, affichage des informations spécifiques aux questions :
chercher "REPERE 6"

	[
		0 : START_GAME
	]

Envois d'un nouveau joueur à tous les joueurs :
chercher "REPERE 7"

	[
		0 : SET_PSEUDO,
		1 : id du nouveau joueur,
		2 : pseudo du nouveau joueur
	]

Envois des statistiques à tous les joueurs après avoir répondu :
chercher "REPERE 8"

	[
		0 : ANSWER_STATS,
		1 : statistiques de la réponse 1,
		2 : statistiques de la réponse 2,
		3 : statistiques de la réponse 3,
		4 : statistiques de la réponse 4
	]

Suppression d'un nouveau player : 
chercher "REPERE 9"

	[
		0 : DEL_PLAYER,
		1 : id du joueur à retirer
	]


 - **Protocole d'échange Serveur-> Ecrans :**

Fin du jeu, affichage des scores (state = END_GAME):
chercher "REPERE 1" 

	[
		0 : END_GAME
		1 : nombre de joueurs 
		2n+2 : Pseudos d'un joueur
		2n+3 : Score d'un joueur
		...
	]

Envois des questions :
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

Décompte pour le début du jeu :
chercher "REPERE 5"

	[
		0 : START_GAME_COUNTDOWN
		1 : Durée du compte à rebours
	]

Début du jeu, affichage des informations spécifiques aux questions :
chercher "REPERE 6"

	[
		0 : START_GAME
	]

Suppression d'un nouveau player : 
chercher "REPERE 9"

	[
		0 : DEL_PLAYER
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


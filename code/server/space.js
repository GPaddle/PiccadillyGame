"use strict";

const WAIT_NOTHING = 0,
	WAIT_COORDINATE = 4;

const START_GAME = 5;

const PLAYER_MOVE = 1,
	NEW_GATE = 2,
	NEW_STARSHIP = 3,
	DEL_STARSHIP = 4;

const DEAD = 1;

const IN_GAME = 3;

const STARSHIP_HEIGHT = 19,
	STARSHIP_WIDTH = 40,
	GAME_HEIGHT = 210,
	//Attention à garder la cohérence avec play/space.js
	SLIDER_MAX = 500;

const DEPART_ORIGINE_X = 900,
	PLAYER_ZONE = 200;

let livingPlayersCount; // nombre de joueurs encore vivant

module.exports = function (game) {
	game.start = function () { // quand la partie se lance
		let gameStart = new Date(Date.now()); // on enregistre la date de début de partie

		livingPlayersCount = game.playersSocks.length; // le nombre de joueurs vivant est au départ égal au nombre de joueurs total

		let speed = 300; // la vitesse initiale des portes est de 300px/s

		let w = 0;

		while (w < game.waitingRoomSocks.length) {
			if (game.waitingRoomSocks[w].isPlayer) game.waitingRoomSocks.splice(w, 1); // on retire les joueurs de la salle d'attente (ceux qui ont validé leur pseudo donc qui sont prêts à jouer)
			else w++; // pour éviter de sauter des élements du tableau
		}

		game.state = IN_GAME; // on passe l'état du jeu à "en cours de partie"

		let gameInfo = [START_GAME, game.playersSocks.length];

		for (let playerSock of game.playersSocks) {
			playerSock.state = WAIT_COORDINATE;
			playerSock.player.coord = 0;
			playerSock.player.alive = true;

			playerSock.send(JSON.stringify([START_GAME])); // on informe tous les joueurs du début de la partie

			gameInfo.push(playerSock.player.id);
		}

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify(gameInfo)); // on envoie aux grands écrans une liste des joueurs (fusées)
		}

		let newGateTimer; // timer à l'issue duquel une nouvelle porte est générée

		let MIN_HEIGHT = 80; // hauteur minimale de la porte
		let MAX_HEIGHT = 100; // hauteur maximale de la porte
		let MIN_POS = 40; // position minimale du haut de porte (en px depuis le haut)
		let MAX_POS = 40; // position maximale du bas de porte (en px depuis le bas)

		function newGate() { // quand on génère une nouvelle porte
			let doorHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT); // on calcule la hauteur de la porte au hasard
			let doorPos = MIN_POS + Math.random() * (GAME_HEIGHT - MIN_POS - MAX_POS - doorHeight); // on calcule la position verticale de la porte au hasard

			if (MIN_HEIGHT - 5 > 2 * STARSHIP_HEIGHT)
				MIN_HEIGHT -= 5; // si la porte est encore assez grande, on diminue la hauteur minimale des portes
			else
				MIN_HEIGHT = 2 * STARSHIP_HEIGHT; // si on ne peut pas diminuer d'avantage sans passer en dessous de notre hauteur minimale absolue, on attribue directement cette limite

			if (MAX_HEIGHT - 5 > 2 * STARSHIP_HEIGHT)
				MAX_HEIGHT -= 5; // si la porte est encore assez grande, on diminue la hauteur maximale des portes
			else
				MIN_HEIGHT = 2 * STARSHIP_HEIGHT; // si on ne peut pas diminuer d'avantage sans passer en dessous de notre hauteur minimale absolue, on attribue directement cette limite


			speed += 30; // on augmente la vitesse des portes

			let starshipsGap = Math.min(50, PLAYER_ZONE / livingPlayersCount); // écart entre le côté gauche de chaque fusée
			let wallPos = DEPART_ORIGINE_X + livingPlayersCount * starshipsGap; // position d'apparition de la porte

			for (let screenSock of game.screensSocks) {
				screenSock.send(JSON.stringify([NEW_GATE, wallPos, doorPos, doorHeight, speed])); // on envoie les données de la porte à tous les grands écrans
			}

			let range = 0; // rang de la fusée

			for (let playerSock of game.playersSocks) { // pour chaque joueur
				if (playerSock.player.alive) { // si le joueur est vivant
					let playerStarshipPos = range * starshipsGap + STARSHIP_WIDTH; // on calcule la position de l'extrémité droite (pointe) de la fusée

					setTimeout(function () { // timer avant lequel la pointe de la fusée passe au niveau de la porte
						if (playerSock.player.coord < doorPos || (playerSock.player.coord + STARSHIP_HEIGHT) > doorPos + doorHeight) { // si la position de la fusée est dans le mur
							playerSock.send(JSON.stringify([DEAD])); // on informe le joueur qu'il est mort

							playerSock.state = WAIT_NOTHING; // on attend plus aucune donnée du joueur pour le moment

							playerSock.player.alive = false; // le joueur est mort
							livingPlayersCount--; // on décrémente le nombre de joueurs vivant

							playerSock.player.score = (new Date(Date.now()) - gameStart) / 1000; // on calcule le score final du joueur

							for (let screenSock of game.screensSocks) {
								screenSock.send(JSON.stringify([DEL_STARSHIP, playerSock.player.id])); // on dit à tous les grands écrans de supprimer la fusée du joueur qui vient de mourir
							}

							if (livingPlayersCount <= 0) {
								game.stop(); // si tous les joueurs sont morts, on arrête la partie
								clearTimeout(newGateTimer); // on déprogramme la création d'une nouvelle porte
							}
						}
					}, (wallPos - playerStarshipPos) / speed * 1000);

					range++;
				}
			}

			newGateTimer = setTimeout(newGate, (wallPos + 200) / speed * 1000); // on programme la création de la prochaine porte
		}

		setTimeout(newGate, 6000); // on programme l'apparition de la première porte dans 6 secondes pour laisser le temps aux joueurs de prendre en main la commande de leur fusée
	}

	game.onMessage = function (sock, msg) { // quand on reçoit un message du joueur
		if (sock.state == WAIT_COORDINATE) { // si on était en attente d'un mouvement de la fusée du joueur
			for (let screenSock of game.screensSocks) {
				sock.player.coord = (parseInt(msg[0]) / SLIDER_MAX) * (GAME_HEIGHT - STARSHIP_HEIGHT); // on calcule la nouvelle coordonnée de la fusée
				screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, sock.player.coord])); // on informe les grands écrans du mouvement du joueur
			}
		}
	}

	game.onPlayerJoinInGame = function (sock, msg) { // quand un joueur rejoint en cours de partie
		game.waitingRoomSocks.splice(game.waitingRoomSocks.indexOf(sock), 1); // on le retire de la salle d'attente

		livingPlayersCount++; // on incrémente le nombre de joueurs vivant

		sock.send(JSON.stringify([START_GAME])); // on informe le joueur que la partie démarre tout de suite pour lui

		sock.state = WAIT_COORDINATE; // on se met en attente d'un mouvement du joueur
		sock.player.coord = 0;
		sock.player.alive = true;

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([NEW_STARSHIP, sock.player.id])); // les grands écrans sont informés de l'ajout d'une fusée
		}
	}

	game.onPlayerLeftInGame = function (sock) { // quand un joueur quitte la partie en cours
		if(sock.player.alive) {
			livingPlayersCount--;
		}

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([DEL_STARSHIP, sock.player.id])); // les grands écrans doivent supprimer la fusée du joueur ayant quitté
		}
	}
}
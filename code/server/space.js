"use strict";

const START_GAME = 6;

const WAIT_COORDINATE = 4;

const PLAYER_MOVE = 0,
	NEW_GATE = 1,
	DEAD = 2;

const STARSHIP_HEIGHT = 10;

let MIN_HEIGHT = 50; // hauteur minimale de la porte
let MAX_HEIGHT = 100; // hauteur maximale de la porte
let MIN_POS = 40; // position minimale du haut de porte (en px depuis le haut)
let MAX_POS = 40; // position maximale du bas de porte (en px depuis le bas)

module.exports = function(game) {
	game.start = function() {
		let gameStart = new Date(Date.now());
		let nbJoueursDead = 0;
		let speed = 300;

		for(let playerSock of game.playersSocks) {
			playerSock.send(JSON.stringify([START_GAME]));
			playerSock.state = WAIT_COORDINATE;
			playerSock.player.coord = 0;
			playerSock.player.alive = true;
		}

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([START_GAME]));
		}

		function newGate() {
			let doorHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
			let doorPos = MIN_POS + Math.random() * (210 - MIN_POS - MAX_POS - doorHeight); // 210px est la hauteur de l'espace de jeu

			if(MIN_HEIGHT - 5 > STARSHIP_HEIGHT) {
				MIN_HEIGHT -= 5;
			}

			if(MAX_HEIGHT - 5 > STARSHIP_HEIGHT) {
				MAX_HEIGHT -= 5; // on diminue de 5px la hauteur maximale à chaque tour pour augmenter la difficulté
			}

			speed += 30;

			for (let screenSock of game.screensSocks) {
				screenSock.send(JSON.stringify([NEW_GATE, doorPos, doorHeight, speed]));
			}

			for(let i = 0; i < game.playersSocks.length; i++) {
				let playerSock = game.playersSocks[i];

				let playerStarshipPos = i * 30 + 21;

				setTimeout(function() {
					if (playerSock.player.alive && (playerSock.player.coord < doorPos || (playerSock.player.coord + STARSHIP_HEIGHT) > doorPos + doorHeight)) {
						playerSock.send(JSON.stringify([DEAD]));
						playerSock.player.alive = false;
						nbJoueursDead++;
						playerSock.player.score = (new Date(Date.now()) - gameStart) / 1000;

						for (let screenSock of game.screensSocks) {
							screenSock.send(JSON.stringify([DEAD, playerSock.player.id]));
						}

						if (nbJoueursDead == game.playersSocks.length) {
							game.endGame();
						}
					}
				}, (1000 - playerStarshipPos) / speed * 1000)
			}

			setTimeout(newGate, 1200 / speed * 1000);
		}

		setTimeout(newGate, 6000);
	}

	game.onMessage = function (sock, msg) {
		if (sock.state == WAIT_COORDINATE) {
			for (let screenSock of game.screensSocks) {
				sock.player.coord = parseInt(msg[0]);
				screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, sock.player.coord]));
			}
		}
	}
}
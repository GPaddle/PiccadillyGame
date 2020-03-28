"use strict";

const WAIT_NOTHING = 0,
	WAIT_COORDINATE = 4;

const START_GAME = 5;

const PLAYER_MOVE = 1,
	NEW_GATE = 2,
	DEAD = 3,
	NEW_PLAYER = 4;

const IN_GAME = 3;

const STARSHIP_HEIGHT = 19;

//Attention, si cette valeur est changée, il faut la changer dans space.js du client (screen)
const DEPART_ORIGINE_X = 800;

module.exports = function(game) {
	game.start = function() {
		let gameStart = new Date(Date.now());

		game.clearWaitingRoom();

		let nbJoueursDead = 0;
		let speed = 300;

		game.state = IN_GAME;

		let gameInfo = [START_GAME, game.playersSocks.length];

		for(let playerSock of game.playersSocks) {
			playerSock.state = WAIT_COORDINATE;
			playerSock.player.coord = 0;
			playerSock.player.alive = true;

			playerSock.send(JSON.stringify([START_GAME]));

			gameInfo.push(playerSock.player.id);
		}

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify(gameInfo));
		}

		let newGateTimer;

		let MIN_HEIGHT = 80; // hauteur minimale de la porte
		let MAX_HEIGHT = 100; // hauteur maximale de la porte
		let MIN_POS = 40; // position minimale du haut de porte (en px depuis le haut)
		let MAX_POS = 40; // position maximale du bas de porte (en px depuis le bas)

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

			let origineX = DEPART_ORIGINE_X + 4 * game.playersSocks.length;

			for (let screenSock of game.screensSocks) {
				screenSock.send(JSON.stringify([NEW_GATE, doorPos, doorHeight, speed]));
			}

			for(let playerSock of game.playersSocks) {
				let playerStarshipPos = playerSock.player.id * 50 + 40;

				setTimeout(function() {
					if (playerSock.player.alive && (playerSock.player.coord < doorPos || (playerSock.player.coord + STARSHIP_HEIGHT) > doorPos + doorHeight)) {
						playerSock.send(JSON.stringify([DEAD]));

						playerSock.state = WAIT_NOTHING;
						playerSock.player.alive = false;
						nbJoueursDead++;
						playerSock.player.score = (new Date(Date.now()) - gameStart) / 1000;

						for (let screenSock of game.screensSocks) {
							screenSock.send(JSON.stringify([DEAD, playerSock.player.id]));
						}

						if (nbJoueursDead == game.playersSocks.length) {
							game.endGame();
							clearTimeout(newGateTimer);
						}
					}
				}, (origineX - playerStarshipPos) / speed * 1000)
			}

			newGateTimer = setTimeout(newGate, 1200 / speed * 1000);
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

	game.onPlayerJoinInGame = function(sock, msg) {
		game.waitingRoomSocks.splice(game.waitingRoomSocks.indexOf(sock), 1);

		sock.send(JSON.stringify([START_GAME]));

		sock.state = WAIT_COORDINATE;
		sock.player.coord = 0;
		sock.player.alive = true;

		for(let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([NEW_PLAYER, sock.player.id]));
		}
	}
}
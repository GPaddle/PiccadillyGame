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

let livingPlayersCount;

module.exports = function (game) {
	game.start = function () {
		let gameStart = new Date(Date.now());

		livingPlayersCount = game.playersSocks.length;
		console.log(livingPlayersCount);

		let speed = 300;

		let w = 0;

		while (w < game.waitingRoomSocks.length) {
			if (game.waitingRoomSocks[w].isPlayer) game.waitingRoomSocks.splice(w, 1);
			else w++; // pour éviter de sauter des élements du tableau
		}

		game.state = IN_GAME;

		let gameInfo = [START_GAME, game.playersSocks.length];

		for (let playerSock of game.playersSocks) {
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
			let doorPos = MIN_POS + Math.random() * (GAME_HEIGHT - MIN_POS - MAX_POS - doorHeight);

			if (MIN_HEIGHT - 5 > STARSHIP_HEIGHT) {
				MIN_HEIGHT -= 5;
			}

			if (MAX_HEIGHT - 5 > STARSHIP_HEIGHT) {
				MAX_HEIGHT -= 5; // on diminue de 5px la hauteur maximale à chaque tour pour augmenter la difficulté
			}

			speed += 30;

			let starshipsGap = Math.min(50, PLAYER_ZONE / livingPlayersCount); // écart entre le côté gauche de chaque fusée
			let wallPos = DEPART_ORIGINE_X + livingPlayersCount * starshipsGap; // position d'apparition de la porte

			for (let screenSock of game.screensSocks) {
				screenSock.send(JSON.stringify([NEW_GATE, wallPos, doorPos, doorHeight, speed]));
			}

			let range = 0;

			for (let playerSock of game.playersSocks) {
				if (playerSock.player.alive) {
					let playerStarshipPos = range * starshipsGap + STARSHIP_WIDTH;

					setTimeout(function () {
						if (playerSock.player.coord < doorPos || (playerSock.player.coord + STARSHIP_HEIGHT) > doorPos + doorHeight) {
							playerSock.send(JSON.stringify([DEAD]));

							playerSock.state = WAIT_NOTHING;

							playerSock.player.alive = false;
							livingPlayersCount--;

							playerSock.player.score = (new Date(Date.now()) - gameStart) / 1000;

							for (let screenSock of game.screensSocks) {
								screenSock.send(JSON.stringify([DEL_STARSHIP, playerSock.player.id]));
							}

							if (livingPlayersCount <= 0) {
								game.stop();
								clearTimeout(newGateTimer);
							}
						}
					}, (wallPos - playerStarshipPos) / speed * 1000);

					range++;
				}
			}

			newGateTimer = setTimeout(newGate, (wallPos + 200) / speed * 1000);
		}

		setTimeout(newGate, /*6000*/20000);
	}

	game.onMessage = function (sock, msg) {
		if (sock.state == WAIT_COORDINATE) {
			for (let screenSock of game.screensSocks) {
				sock.player.coord = (parseInt(msg[0]) / SLIDER_MAX) * (GAME_HEIGHT - STARSHIP_HEIGHT);
				screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, sock.player.coord]));
			}
		}
	}

	game.onPlayerJoinInGame = function (sock, msg) {
		game.waitingRoomSocks.splice(game.waitingRoomSocks.indexOf(sock), 1);

		livingPlayersCount++;

		sock.send(JSON.stringify([START_GAME]));

		sock.state = WAIT_COORDINATE;
		sock.player.coord = 0;
		sock.player.alive = true;

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([NEW_STARSHIP, sock.player.id]));
		}
	}

	game.onPlayerLeftInGame = function (sock) {
		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([DEL_STARSHIP, sock.player.id]));
		}
	}
}
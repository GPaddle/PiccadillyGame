"use strict";

module.exports = {};
let game = module.exports;

const server = require("./websocket.js");

const START_GAME = 6;

const WAIT_COORDINATE = 4;

const PLAYER_MOVE = 0,
	NEW_GATE = 1,
	DEAD = 2;

let doorHeight, doorPos;

let nbJoueursDead = 0;

const STARSHIP_HEIGHT = 10;

let MIN_HEIGHT = 50; // hauteur minimale de la porte
let MAX_HEIGHT = 100; // hauteur maximale de la porte
let MIN_POS = 40; // position minimale du haut de porte (en px depuis le haut)
let MAX_POS = 40; // position maximale du bas de porte (en px depuis le bas)

function generateGate() {
	doorHeight = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
	doorPos = MIN_POS + Math.random() * (210 - MIN_POS - MAX_POS - doorHeight); // 210px est la hauteur de l'espace de jeu

	if(MIN_HEIGHT - 5 > STARSHIP_HEIGHT) {
		MIN_HEIGHT -= 5;
	}

	if(MAX_HEIGHT - 5 > STARSHIP_HEIGHT) {
		MAX_HEIGHT -= 5; // on diminue de 5px la hauteur maximale à chaque tour pour augmenter la difficulté
	}
}

function collisionTimeout() {
	setTimeout(function () {
		for (let playerSock of server.playersSocks) {
			if (playerSock.player.alive && (playerSock.player.coord < doorPos || (playerSock.player.coord + STARSHIP_HEIGHT) > doorPos + doorHeight)) {
				playerSock.send(JSON.stringify([DEAD]));
				playerSock.player.alive = false;
				nbJoueursDead++;
				playerSock.player.score = (new Date(Date.now()) - gameStart) / 1000;

				for (let screenSock of server.screensSocks) {
					screenSock.send(JSON.stringify([DEAD, playerSock.player.id]));
				}

				if (nbJoueursDead == server.playersSocks.length) {
					server.endGame();
				}
			}
		}
	}, 2400);
}
let gameStart;

game.start = function () {
	generateGate();

	gameStart = new Date(Date.now());

	for (let screenSock of server.screensSocks) {
		screenSock.send(JSON.stringify([START_GAME, doorPos, doorHeight]));
	}

	for (let playerSock of server.playersSocks) {
		playerSock.send(JSON.stringify([START_GAME]));
		playerSock.state = WAIT_COORDINATE;
		playerSock.player.coord = 0;
		playerSock.player.alive = true;
	}

	collisionTimeout();

	setInterval(function () {
		generateGate();

		for (let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify([NEW_GATE, doorPos, doorHeight]));
		}

		collisionTimeout();
	}, 3000);
}

game.onMessage = function (sock, msg) {
	if (sock.state == WAIT_COORDINATE) {
		for (let screenSock of server.screensSocks) {
			sock.player.coord = parseInt(msg[0]);
			screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, sock.player.coord]));
		}
	}
}
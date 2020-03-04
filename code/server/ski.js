"use strict";

module.exports = {};
let game = module.exports;

const server = require("./websocket.js");

const START_GAME = 6;

const WAIT_COORDINATE = 4;

const PLAYER_MOVE = 0,
	NEW_GATE = 1,
	DEAD = 2;

let haut, ecart;

function generateGate() {
	ecart = Math.random() * ((50-25)+1)+25;
	haut = Math.random() * (200 - ecart) / 2;
}

function collisionTimeout() {
	setTimeout(function() {
		for(let playerSock of server.playersSocks) {
			if(playerSock.player.coord < haut || playerSock.player.coord > haut + ecart) {
				console.log("le joueur " + playerSock.player.id + " a heurté la porte");

				playerSock.send(JSON.stringify([DEAD]));

				for(let screenSock of server.screensSocks) {
					screenSock.send(JSON.stringify([DEAD, playerSock.player.id]));
				}
			}
		}
	}, 2400);
}

game.start = function() {
	generateGate();

	for(let screenSock of server.screensSocks) {
		screenSock.send(JSON.stringify([START_GAME, haut, ecart]));
	}

	for(let playerSock of server.playersSocks) {
		playerSock.send(JSON.stringify([START_GAME]));
		playerSock.state = WAIT_COORDINATE;
		playerSock.player.coord = 0;
	}

	collisionTimeout();

	setInterval(function() {
		generateGate();

		for(let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify([NEW_GATE, haut, ecart]));
		}

		collisionTimeout();
	}, 3000);
}

game.onMessage = function(sock, msg) {
	if(sock.state == WAIT_COORDINATE) {
		for(let screenSock of server.screensSocks) {
			sock.player.coord = msg[0];
			screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, sock.player.coord]));
		}
	}
}
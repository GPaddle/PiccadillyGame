"use strict";

module.exports = {};
let game = module.exports;

const server = require("./websocket.js");

const START_GAME = 6;

const WAIT_COORDINATE = 4;

const PLAYER_MOVE = 0,
	NEW_GATE = 1;

game.start = function() {
	let posX = 1000;
	let haut = Math.random() * (200 / 2);
	let ecart = Math.random() * (200 / 4) + 25;

	console.log("haut : " + haut);
	console.log("ecart : " + ecart);

	for(let screenSock of server.screensSocks) {
		screenSock.send(JSON.stringify([START_GAME, haut, ecart]));
	}

	for(let playerSock of server.playersSocks) {
		playerSock.send(JSON.stringify([START_GAME]));
		playerSock.state = WAIT_COORDINATE;
	}

	setInterval(function() {
		posX = 1000;
		haut = Math.random() * (200 / 2);
		ecart = Math.random() * (200 / 4) + 25;

		for(let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify([NEW_GATE, haut, ecart]));
		}
	}, 3000)
}

game.onMessage = function(sock, msg) {
	if(sock.state == WAIT_COORDINATE) {
		for(let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, msg[0]]));
		}
	}
}
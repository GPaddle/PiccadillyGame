"use strict";

module.exports = {};
let game = module.exports;

const server = require("./websocket.js");

const START_GAME = 6;

const WAIT_COORDINATE = 4;

const PLAYER_MOVE = 0;

game.start = function() {
	for(let screenSock of server.screensSocks) {
		screenSock.send(JSON.stringify([START_GAME]));
	}

	for(let playerSock of server.playersSocks) {
		playerSock.send(JSON.stringify([START_GAME]));
		playerSock.state = WAIT_COORDINATE;
	}
}

game.onMessage = function(sock, msg) {
	if(sock.state == WAIT_COORDINATE) {
		for(let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify([PLAYER_MOVE, sock.player.id, msg[0]]));
		}
	}
}
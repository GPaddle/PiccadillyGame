const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;

const STATE_NONE = 0;
const STATE_WAITING_ROOM = 1;
const STATE_AUTH = 2;
const STATE_PSEUDO = 3;

const SCREEN_SECRET_KEY = "piccascreendilly447";

const MIN_PLAYER = 10;

module.exports = function(httpServer) {
	const wss = new ws.Server({server: httpServer});

	let screenSock;
	const playersSocks = [];

	let state = STATE_WAITING_ROOM;

	let nextPlayerId = 0;

	wss.on("connection", function(sock) {
		if(state == STATE_WAITING_ROOM) {
			sock.state = STATE_AUTH;

			sock.on("message", function(json) {
				let msg = JSON.parse(json);

				switch(state) {
					case STATE_WAITING_ROOM:
						switch(sock.state) {
							case STATE_AUTH:
								if(msg[0] == CLIENT_TYPE_PLAYER) {
									sock.player = {};
									sock.player.id = nextPlayerId;
									nextPlayerId++;

									sock.player.pseudo = "???";

									playersSocks.push(sock);

									let players = [];

									for(playerSock of playersSocks) {
										players.push(playerSock.player);
										playerSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
									}

									sock.send(JSON.stringify([MIN_PLAYER, players]));

									sock.state = STATE_PSEUDO;
								} else if(msg[1] == CLIENT_TYPE_SCREEN) {
									screenSock = sock;
									sock.state = STATE_NONE
								}

								break;

							case STATE_PSEUDO:
								let isPseudoFree = true;

								for(playerSock of playersSocks) {
									if(msg[0] == playerSock.player.pseudo) {
										isPseudoFree = false;
										break;
									}
								}

								if(isPseudoFree) {
									sock.player.pseudo = msg[0];

									for(playerSock of playersSocks) {
										playerSock.send(JSON.stringify([SET_PSEUDO, sock.player.id, sock.player.pseudo]));
									}

									sock.state = STATE_NONE;
								}

								break;
						}

						break;
				}
			});

			sock.on("close", function() {
				if(state == STATE_WAITING_ROOM && sock.player) {
					playersSocks.splice(playersSocks.indexOf(sock), 1);

					for(playerSock of playersSocks) {
						playerSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
					}
				}
			});
		}
	});
}
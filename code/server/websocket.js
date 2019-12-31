const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const DEL_PLAYER = 1;

const STATE_NONE = 0;
const STATE_AUTH = 1;
const STATE_PSEUDO = 2;

const SCREEN_SECRET_KEY = "piccascreendilly447";

const MIN_PLAYER = 10;

module.exports = function(httpServer) {
	const wss = new ws.Server({server: httpServer});

	let screenSock;
	const players = [];

	wss.on("connection", function(sock) {
		sock.state = STATE_AUTH;

		let playersPseudos = [];

		players.forEach(function(player) {
			playersPseudos.push(player.pseudo);
		})

		sock.send(JSON.stringify([players.length, MIN_PLAYER, playersPseudos]));

		sock.on("message", function(json) {
			let msg = JSON.parse(json);

			switch(sock.state) {
				case STATE_AUTH:
					if(msg[0] == CLIENT_TYPE_PLAYER) {
						players.push(sock);
						sock.state = STATE_PSEUDO;
					} else if(msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY && !screenSock) {
						screenSock = sock;
					}

					break;

				case STATE_PSEUDO:
					sock.pseudo = msg[0];

					players.forEach(function(player) {
						player.send(JSON.stringify([ADD_PLAYER, sock.pseudo]));
					});

					break;
			}
		});
	});
}
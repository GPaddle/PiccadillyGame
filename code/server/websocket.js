"use strict";

module.exports = {};
let server = module.exports; // toutes les variables ou fonctions qui commencent par "server" sont partagées avec le fichier spécifique au jeu (questions.js ou space.js)

const fs = require("fs");
const ws = require("ws");

const conf = JSON.parse(fs.readFileSync("conf/conf.json"));

const game = require(conf.jeu) // le module game contient les fonctions propres à chaque jeu (questions ou espace)

const CLIENT_TYPE_PLAYER = 0,
	CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	PSEUDO_OK = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME_COUNTDOWN = 4,
	END_GAME = 5;

const WAIT_NOTHING = 0,
	WAIT_AUTH = 1,
	WAIT_PSEUDO = 2,
	WAIT_REPLAY = 3;

const WAITING_ROOM = 0, // les différents états du jeu. attente de joueurs
	BEGIN_COUNT_DOWN = 1, // compte à rebours avant le début de la partie
	SCORE = 2; // affichage des scores finaux
// toutes les valeurs au dessus de SCORE veulent dire qu'on est en jeu

const pseudoPossibilities = JSON.parse(fs.readFileSync("ressources/pseudos.json"));

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const TEST_MODE = conf.testMode;

const MIN_PLAYER = TEST_MODE ? 1 : conf.minPlayer;
const GAME_COUNT_DOWN_TIME = TEST_MODE ? 1 : conf.gameCountDownTime;

server.playersSocks = []; // tableau de tous les joueurs
server.waitingRoomSocks = []; // tableau des personnes se trouvant en salle d'attente qui recoivent les évènements de salle d'attente ("bidule s'est connecté", "machin s'est déconnecté")
server.screensSocks = []; // tableau de tous les écrans d'affichage connectés au serveur

server.gameState = WAITING_ROOM;

let nextPlayerId = 0;

server.startWebSocket = function (httpServer) {
	const wss = new ws.Server({ server: httpServer });

	wss.on("connection", function (sock) {
		sock.state = WAIT_AUTH;

		sock.on("message", function (json) {
			let msg = JSON.parse(json);

			switch (sock.state) {
				case WAIT_AUTH: {
					if (msg[0] == CLIENT_TYPE_PLAYER) {
						initPrePlayer(sock);
					} else if (msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY) {
						//REPERE 10
						sock.send(JSON.stringify([MIN_PLAYER, server.playersSocks.length]));
						sock.state = WAIT_NOTHING;
						server.screensSocks.push(sock);
					}

					break;
				}

				case WAIT_PSEUDO: {
					let isPseudoFree = true;

					for (let playerSock of server.playersSocks) {
						if (msg[0] == playerSock.player.pseudo) {
							isPseudoFree = false;
							break;
						}
					}

					if (isPseudoFree) {
						sock.isPlayer = true;

						sock.player = {};
						sock.player.id = nextPlayerId;
						sock.player.pseudo = msg[0];

						nextPlayerId++;

						server.playersSocks.push(sock);

						sock.send(JSON.stringify([PSEUDO_OK, sock.player.id]));

						if (server.gameState == WAITING_ROOM || server.gameState == BEGIN_COUNT_DOWN) {
							for (let screenSock of server.screensSocks) {
								screenSock.send(JSON.stringify([ADD_PLAYER, sock.player.id]));
							}
						}

						for (let waitingRoomSock of server.waitingRoomSocks) {
							if (waitingRoomSock != sock) {
								waitingRoomSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
							}
						}

						if (server.gameState == WAITING_ROOM && server.playersSocks.length >= MIN_PLAYER) {
							startBeginCountdown();
						} else if (server.gameState > SCORE) { // supérieur à score donc c'est qu'on est en pleine partie
							sock.player.score = 0;
							game.onPlayerJoinInGame(sock);
						}
					} else {
						sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
					}

					break;
				}

				case WAIT_REPLAY: {
					initPrePlayer(sock);
					break;
				}

				default: {
					game.onMessage(sock, msg); // on déclenche l'évènement onMessage du jeu actuel (nouvelle réponse, mouvement du space du joueur...)
					break;
				}
			}
		});

		sock.on("close", function () {
			let screensSocksIndex = server.screensSocks.indexOf(sock);
			let playersSocksIndex = server.playersSocks.indexOf(sock);
			let waitingRoomSocksIndex = server.waitingRoomSocks.indexOf(sock);

			if (screensSocksIndex != -1) {
				server.screensSocks.splice(screensSocksIndex, 1);
			} else if (playersSocksIndex != -1) {
				//REPERE 9

				server.playersSocks.splice(playersSocksIndex, 1);

				if (server.gameState == WAITING_ROOM || server.gameState == BEGIN_COUNT_DOWN) {
					for (let screenSock of server.screensSocks) {
						screenSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
					}
				}

				for (let waitingRoomSock of server.waitingRoomSocks) {
					waitingRoomSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
				}
			} else if (waitingRoomSocksIndex != -1) {
				server.waitingRoomSocks.splice(waitingRoomSocksIndex, 1);
			}
		});
	});
}

function initPrePlayer(sock) { // quand un joueur entre en salle d'attente (après s'être connecté ou quand il clique sur "rejouer")
	let random1 = Math.floor(Math.random() * (pseudoPossibilities.names.length - 1));
	let random2 = Math.floor(Math.random() * (pseudoPossibilities.adjectives.length - 1));

	let pseudoPart1 = pseudoPossibilities.names[random1];
	let pseudoPart2 = pseudoPossibilities.adjectives[random2];

	let pseudoSuggestion = `${pseudoPart1} ${pseudoPart2}`; // on génère une proposition de pseudo au joueur qu'il pourra confirmer ou changer

	// format de la trame sérialisée gameInfo : suggestion de pseudo, nombre de joueur, id, "pseudo", id, "pseudo"...

	let gameInfo = [pseudoSuggestion, server.playersSocks.length];

	for (let i = 0; i < server.playersSocks.length; i++) {

		//		gameInfo[gameInfo.length + i * 2] = server.playersSocks[i].player.id;
		//		gameInfo[gameInfo.length + 1 + i * 2] = server.playersSocks[i].player.pseudo;
		gameInfo[2 + i * 2] = server.playersSocks[i].player.id;
		gameInfo[3 + i * 2] = server.playersSocks[i].player.pseudo;
	}

	sock.send(JSON.stringify(gameInfo));
	server.waitingRoomSocks.push(sock);

	sock.state = WAIT_PSEUDO;
}

function startBeginCountdown() {
	server.gameState = BEGIN_COUNT_DOWN;

	for (let screenSock of server.screensSocks) {
		screenSock.send(JSON.stringify([START_GAME_COUNTDOWN, GAME_COUNT_DOWN_TIME]));
	}

	let beginCountdown = setTimeout(function () {
		for (let playerSock of server.playersSocks) { // on initialise tous les scores des joueurs à 0
			playerSock.player.score = 0;
		}

		game.start();
	}, GAME_COUNT_DOWN_TIME * 1000); // quand on a assez de joueurs on lance la partie dans 15 secondes
}

server.clearWaitingRoom = function () { // supprime tous les joueurs qui ont validé leur pseudo de la salle d'attente
	for (let i = 0; i < server.waitingRoomSocks.length; i++) {
		if (server.waitingRoomSocks[i].isPlayer) {
			server.waitingRoomSocks.splice(i, 1);
			i--; // pour éviter de sauter des élements du tableau
		}
	}
}

server.endGame = function () {
	server.gameState = SCORE;

	let scores = [];

	for (let i = 0; i < server.playersSocks.length; i++) {
		scores[i] = {
			"pseudo": server.playersSocks[i].player.pseudo,
			"score": server.playersSocks[i].player.score
		}
	}

	scores.sort(function (a, b) {
		return b.score - a.score;
	})

	let screensSocksScores = [END_GAME, server.playersSocks.length];

	for (let i = 0; i < server.playersSocks.length; i++) {
		server.playersSocks[i].send(JSON.stringify([END_GAME, server.playersSocks[i].player.score]));

		server.playersSocks[i].state = WAIT_REPLAY;

		screensSocksScores[2 + i * 2] = scores[i].pseudo;
		screensSocksScores[3 + i * 2] = scores[i].score;
	}

	for (let screenSock of server.screensSocks) {
		screenSock.send(JSON.stringify(screensSocksScores));
	}

	server.playersSocks = [];

	setTimeout(function () { // on affiche les scores pendant 30 secondes puis on reprépare une nouvelle partie
		server.gameState = WAITING_ROOM;

		for (let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify([MIN_PLAYER, server.playersSocks.length]));
		}

		if (server.playersSocks.length >= MIN_PLAYER) { // s'il y a déjà assez de joueurs quand on sort de l'écran d'affichage des scores, on déclenche directement le décompte de début de partie
			startBeginCountdown();
		}
	}, 30000);
}
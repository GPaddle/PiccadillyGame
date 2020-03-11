"use strict";

const fs = require("fs");
const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0,
	CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	PSEUDO_OK = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME_COUNTDOWN = 4,
	START_GAME = 5;

const END_GAME = 0;

const WAIT_NOTHING = 0,
	WAIT_AUTH = 1,
	WAIT_PSEUDO = 2,
	WAIT_REPLAY = 3;

const WAITING_ROOM = 0, // les différents états du jeu. attente de joueurs
	BEGIN_COUNT_DOWN = 1, // compte à rebours avant le début de la partie
	SCORE = 2; // affichage des scores finaux
// toutes les valeurs au dessus de SCORE veulent dire qu'on est en jeu

module.exports = function (httpServer, conf) {
	const wss = new ws.Server({ server: httpServer });

	const game = {}; // l'objet game contient les variables et fonctions partagées entre websocket.js et le fichier de jeu (questions.js ou space.js)

	game.playersSocks = []; // tableau de tous les joueurs
	game.waitingRoomSocks = []; // tableau des personnes se trouvant en salle d'attente qui recoivent les évènements de salle d'attente ("bidule s'est connecté", "machin s'est déconnecté")
	game.screensSocks = []; // tableau de tous les écrans d'affichage connectés au serveur

	game.state = WAITING_ROOM;

	game.conf = conf;

	const pseudoPossibilities = JSON.parse(fs.readFileSync("ressources/pseudos.json"));

	let nextPlayerId = 0;

	if(conf.testMode) {
		conf.minPlayer = 1;
		conf.countdownTime = 1;
	}

	const initGame = require("./" + conf.game + ".js");
	initGame(game); // on remplit l'objet game avec les fonctions propres au jeu choisi

	function startBeginCountdown() {
		game.state = BEGIN_COUNT_DOWN;

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([START_GAME_COUNTDOWN, conf.countdownTime]));
		}

		let beginCountdown = setTimeout(function () {
			for (let playerSock of game.playersSocks) { // on initialise tous les scores des joueurs à 0
				playerSock.player.score = 0;
			}

			game.start();
		}, conf.countdownTime * 1000); // quand on a assez de joueurs on lance la partie dans 15 secondes
	}

	game.endGame = function() {
		game.state = SCORE;

		let scores = [];

		for (let i = 0; i < game.playersSocks.length; i++) {
			scores[i] = {
				"pseudo": game.playersSocks[i].player.pseudo,
				"score": game.playersSocks[i].player.score
			}
		}

		scores.sort(function (a, b) {
			return b.score - a.score;
		})

		let screensSocksScores = [END_GAME, game.playersSocks.length];

		for (let i = 0; i < game.playersSocks.length; i++) {
			game.playersSocks[i].send(JSON.stringify([END_GAME, game.playersSocks[i].player.score]));

			game.playersSocks[i].state = WAIT_REPLAY;

			screensSocksScores.push(scores[i].pseudo);
			screensSocksScores.push(scores[i].score);
		}

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify(screensSocksScores));
		}

		game.playersSocks = [];

		setTimeout(function () { // on affiche les scores pendant 30 secondes puis on reprépare une nouvelle partie
			game.state = WAITING_ROOM;

			for (let screenSock of game.screensSocks) {
				screenSock.send(JSON.stringify([conf.minPlayer, game.playersSocks.length]));
			}

			if (game.playersSocks.length >= conf.minPlayer) { // s'il y a déjà assez de joueurs quand on sort de l'écran d'affichage des scores, on déclenche directement le décompte de début de partie
				startBeginCountdown();
			}
		}, 30000);
	}

	game.clearWaitingRoom = function() { // supprime tous les joueurs qui ont validé leur pseudo de la salle d'attente
		for (let i = 0; i < game.waitingRoomSocks.length; i++) {
			if (game.waitingRoomSocks[i].isPlayer) {
				game.waitingRoomSocks.splice(i, 1);
				i--; // pour éviter de sauter des élements du tableau
			}
		}
	}

	wss.on("connection", function (sock) {
		sock.state = WAIT_AUTH;

		function initPrePlayer() { // quand un joueur entre en salle d'attente (après s'être connecté ou quand il clique sur "rejouer")
			let random1 = Math.floor(Math.random() * (pseudoPossibilities.names.length - 1));
			let random2 = Math.floor(Math.random() * (pseudoPossibilities.adjectives.length - 1));

			let pseudoPart1 = pseudoPossibilities.names[random1];
			let pseudoPart2 = pseudoPossibilities.adjectives[random2];

			let pseudoSuggestion = `${pseudoPart1} ${pseudoPart2}`; // on génère une proposition de pseudo au joueur qu'il pourra confirmer ou changer

			// format de la trame sérialisée gameInfo : suggestion de pseudo, nombre de joueur, id, "pseudo", id, "pseudo"...

			let gameInfo = [pseudoSuggestion, game.playersSocks.length, conf.testMode];

			for (let i = 0; i < game.playersSocks.length; i++) {
				gameInfo.push(game.playersSocks[i].player.id);
				gameInfo.push(game.playersSocks[i].player.pseudo);
			}

			sock.send(JSON.stringify(gameInfo));
			game.waitingRoomSocks.push(sock);

			sock.state = WAIT_PSEUDO;
		}

		sock.on("message", function(json) {
			let msg = JSON.parse(json); // attention : si c'est pas du json, ça plante

			switch (sock.state) {
				case WAIT_AUTH: {
					if (msg[0] == CLIENT_TYPE_PLAYER) {
						initPrePlayer();
					} else if (msg[0] == CLIENT_TYPE_SCREEN) {
						//REPERE 10
						sock.send(JSON.stringify([conf.minPlayer, game.playersSocks.length]));
						sock.state = WAIT_NOTHING;
						game.screensSocks.push(sock);
					}

					break;
				}

				case WAIT_PSEUDO: {
					let isPseudoFree = true;

					for (let playerSock of game.playersSocks) {
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

						game.playersSocks.push(sock);

						sock.send(JSON.stringify([PSEUDO_OK, sock.player.id]));

						if (game.state == WAITING_ROOM || game.state == BEGIN_COUNT_DOWN) {
							for (let screenSock of game.screensSocks) {
								screenSock.send(JSON.stringify([ADD_PLAYER]));
							}
						}

						for (let waitingRoomSock of game.waitingRoomSocks) {
							if (waitingRoomSock != sock) {
								waitingRoomSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
							}
						}

						if (game.state == WAITING_ROOM && game.playersSocks.length >= conf.minPlayer) {
							startBeginCountdown();
						} else if (game.state > SCORE) { // supérieur à score donc c'est qu'on est en pleine partie
							sock.player.score = 0;
							game.onPlayerJoinInGame(sock);
						}
					} else {
						sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
					}

					break;
				}

				case WAIT_REPLAY: {
					initPrePlayer();
					break;
				}

				default: {
					game.onMessage(sock, msg); // on déclenche l'évènement onMessage du jeu actuel (nouvelle réponse, mouvement du space du joueur...)
					break;
				}
			}
		});

		sock.on("close", function () {
			let screensSocksIndex = game.screensSocks.indexOf(sock);
			let playersSocksIndex = game.playersSocks.indexOf(sock);
			let waitingRoomSocksIndex = game.waitingRoomSocks.indexOf(sock);

			if (screensSocksIndex != -1) {
				game.screensSocks.splice(screensSocksIndex, 1);
			} else if (playersSocksIndex != -1) {
				//REPERE 9

				game.playersSocks.splice(playersSocksIndex, 1);

				if (game.state == WAITING_ROOM || game.state == BEGIN_COUNT_DOWN) {
					for (let screenSock of game.screensSocks) {
						screenSock.send(JSON.stringify([DEL_PLAYER]));
					}
				}

				for (let waitingRoomSock of game.waitingRoomSocks) {
					waitingRoomSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
				}
			} else if (waitingRoomSocksIndex != -1) {
				game.waitingRoomSocks.splice(waitingRoomSocksIndex, 1);
			}
		});
	});
}
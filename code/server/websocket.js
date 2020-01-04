"use strict";

const fs = require("fs");
const ws = require("ws");

//Changer l'état à true pour aller plus vite
const TEST_MODE = true;

const CLIENT_TYPE_PLAYER = 0,
	CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	SET_PSEUDO = 1,
	DEL_PLAYER = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME_COUNTDOWN = 4,
	START_GAME = 5;

const NEW_QUESTION = 0,
	ANSWERS_STATS = 1,
	END_QUESTION = 2,
	END_GAME = 3;

const RESULTS = 0;

const STATE_NONE = 0,
	STATE_WAITING_ROOM = 1,
	STATE_AUTH = 2,
	STATE_PSEUDO = 3,
	STATE_GAME = 4,
	STATE_RESULTS = 5;

let file;

TEST_MODE ? file = "questions2.json" : file = "questions.json";
const questions = JSON.parse(fs.readFileSync(file));

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const MIN_PLAYER = 2;
let GAME_COUNT_DOWN_TIME;

TEST_MODE ? GAME_COUNT_DOWN_TIME = 5 : GAME_COUNT_DOWN_TIME = 15;

module.exports = function(httpServer) {
	const wss = new ws.Server({server: httpServer});

	let screensSocks = [];
	const playersSocks = [];

	let state = STATE_WAITING_ROOM;

	let nextPlayerId = 0;

	let actualQuestion = -1;

	let startCountdown;

	function startGame() {
		for(let playerSock of playersSocks) {
			playerSock.send(JSON.stringify([START_GAME])); // on dit aux joueurs que la partie commence (pour qu'ils affichent l'interface des questions)
		}

		for(let screenSock of screensSocks) {
			screenSock.send(JSON.stringify([START_GAME]));
		}

		function nextQuestion() {
			state = STATE_GAME;
			actualQuestion++;

			if(actualQuestion == questions.length) {
				let scores = [];

				for(let playerSock of playersSocks) {
					playerSock.send(JSON.stringify([END_GAME])); // on envoit la bonne réponse aux joueurs

					// on calcule le score de ce joueur

					let score = [];
					score[0] = playerSock.player.pseudo;

					let points = 0;

					for(let i = 0; i < playerSock.player.answers.length; i++) {
						if(playerSock.player.answers[i] == questions[i][2]) {
							points++;
						}
					}

					score[1] = points;

					scores.push(score);
				}

				for(let screenSock of screensSocks) {
					screenSock.send(JSON.stringify([END_GAME, scores]));
				}
			} else {
				for(let playerSock of playersSocks) {
					playerSock.send(JSON.stringify([NEW_QUESTION, questions[actualQuestion][3]])); // on envoit uniquement le temps de la question aux joueurs, l'intitulé de la question sera affiché sur les grands écrans
				}

				let screenSockQuestion = [ // on envoit aux grands écrans : l'intitulé de la question, les réponses possibles et le temps de la question
					questions[actualQuestion][0],
					questions[actualQuestion][1],
					questions[actualQuestion][3]
				]

				for(let screenSock of screensSocks) {
					screenSock.send(JSON.stringify([NEW_QUESTION, screenSockQuestion]));
				}

				setTimeout(function() {
					state = STATE_NONE;

					for(let screenSock of screensSocks) {
						screenSock.send(JSON.stringify([questions[actualQuestion][2]]));
					}

					for(let playerSock of playersSocks) {
						playerSock.send(JSON.stringify([END_QUESTION, questions[actualQuestion][2]])); // on envoit la bonne réponse aux joueurs
					}

					let time = TEST_MODE ? 1000 : 6000;
					setTimeout(nextQuestion, time);
				}, questions[actualQuestion][3] * 1000);
			}
		}

		nextQuestion(); // on envoit la première question
	}

	wss.on("connection", function(sock) {
		if(state == STATE_WAITING_ROOM) {
			sock.state = STATE_AUTH;

			let authTimeout = setTimeout(function() {
				sock.close();
			}, 10000);

			sock.on("message", function(json) {
				let msg = JSON.parse(json);

				switch (state) {
					case STATE_WAITING_ROOM: {
						switch (sock.state) {
							case STATE_AUTH: {
								if(msg[0] == CLIENT_TYPE_PLAYER) {
									clearTimeout(authTimeout);

									sock.player = {};

									sock.player.id = nextPlayerId;
									nextPlayerId++;

									sock.player.answers = [];
									sock.player.pseudo = "un inconnu";

									let players = [];

									for(let playerSock of playersSocks) {
										players.push(playerSock.player);
										playerSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
									}

									players.push(sock.player);

									for(let screenSock of screensSocks) {
										screenSock.send(JSON.stringify([ADD_PLAYER]));
									}

									sock.send(JSON.stringify([MIN_PLAYER, players, sock.player.id]));
									sock.state = STATE_PSEUDO;

									playersSocks.push(sock);

									if(playersSocks.length >= MIN_PLAYER && startCountdown === undefined) {
										for(let playerSock of playersSocks) {
											playerSock.send(JSON.stringify([START_GAME_COUNTDOWN, GAME_COUNT_DOWN_TIME]));
										}

										for(let screenSock of screensSocks) {
											screenSock.send(JSON.stringify([START_GAME_COUNTDOWN, GAME_COUNT_DOWN_TIME]));
										}

										startCountdown = setTimeout(startGame, GAME_COUNT_DOWN_TIME * 1000); // quand on a assez de joueurs on lance la partie dans 15 secondes
									}
								} else if(msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY) {
									clearTimeout(authTimeout);

									sock.send(JSON.stringify([MIN_PLAYER, playersSocks.length]));
									sock.state = STATE_NONE;

									screensSocks.push(sock);
								} else {
									sock.close();
								}

								break;
							}

							case STATE_PSEUDO: {
								let isPseudoFree = true;

								for(let playerSock of playersSocks) {
									if(msg[0] == playerSock.player.pseudo) {
										isPseudoFree = false;
										break;
									}
								}

								if(isPseudoFree) {
									sock.player.pseudo = msg[0];

									for(let playerSock of playersSocks) {
										playerSock.send(JSON.stringify([SET_PSEUDO, sock.player.id, sock.player.pseudo]));
									}

									sock.state = STATE_NONE;
								} else {
									sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
								}

								break;
							}
						}

						break;
					}

					case STATE_GAME: {
						if(sock.player.answers[actualQuestion] === undefined && msg[0] >= 0 && msg[0] <= 3) { // si le joueur n'a pas encore donné de réponse et si le code de réponse est 0, 1, 2 ou 3
							sock.player.answers[actualQuestion] = msg[0]; // on enregistre la réponse envoyée par le joueur

							let answerStats = [0, 0, 0, 0];

							for(let playerSock of playersSocks) {
								answerStats[playerSock.player.answers[actualQuestion]]++;
							}

							let percentStats = [];

							for(let i = 0; i < answerStats.length; i++) {
								percentStats[i] = Math.trunc((answerStats[i] / playersSocks.length * 100) * 10) / 10;
							}

							for(let playerSock of playersSocks) {
								if(playerSock.player.answers[actualQuestion] !== undefined) { // on envoit seulements les statistiques de réponse aux joueurs ayant déjà répondu à la question
									playerSock.send(JSON.stringify([ANSWERS_STATS, percentStats]));
								}
							}
						}

						break;
					}
				}
			});

			sock.on("close", function() {
				if(sock.player === undefined) {
					screensSocks.splice(screensSocks.indexOf(sock), 1);
				} else {
					playersSocks.splice(playersSocks.indexOf(sock), 1);
				}

				if(state == STATE_WAITING_ROOM) {
					for(let screenSock of screensSocks) {
						screenSock.send(JSON.stringify([DEL_PLAYER]));
					}

					for(let playerSock of playersSocks) {
						playerSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
					}
				}
			});
		} else {
			sock.close();
		}
	});
}
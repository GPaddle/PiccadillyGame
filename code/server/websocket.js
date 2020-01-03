"use strict";

const fs = require("fs");
const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;
const START_GAME_COUNTDOWN = 4;
const START_GAME = 5;

const NEW_QUESTION = 0;
const ANSWERS_STATS = 1;

const State = {
	NONE: 0,
	WAITING_ROOM: 1,
	AUTH: 2,
	PSEUDO: 3,
	GAME: 4,
};

const questions = JSON.parse(fs.readFileSync("questions.json"));

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const MIN_PLAYER = 2;

const GAME_COUNT_DOWN_TIME = 15;

module.exports = function(httpServer) {
	const wss = new ws.Server({ server: httpServer });

	let screensSocks = [];
	const playersSocks = [];

	let state = State.WAITING_ROOM;

	let nextPlayerId = 0;

	let actualQuestion = -1;

	let startCountdown;

	let answerStats;

	function startGame() {
		for(let playerSock of playersSocks) {
			playerSock.send(JSON.stringify([START_GAME])); // on dit aux joueurs que la partie commence (pour qu'ils affichent l'interface des questions)
		}

		for(let screenSock of screensSocks) {
			screenSock.send(JSON.stringify([START_GAME]));
		}

		function nextQuestion() {
			actualQuestion++;

			for(let playerSock of playersSocks) {
				playerSock.send(JSON.stringify([NEW_QUESTION, questions[actualQuestion][3]]));
			}

			for(let screenSock of screensSocks) {
				screenSock.send(JSON.stringify(questions[actualQuestion]));
			}

			answerStats = [0, 0, 0, 0];

			if(actualQuestion < questions.length - 1) {
				setTimeout(nextQuestion, questions[actualQuestion][3] * 1000);
			}
		}

		nextQuestion(); // on envoit la première question

		state = State.GAME;
	}

	wss.on("connection", function(sock) {
		if (state == State.WAITING_ROOM) {
			sock.state = State.AUTH;

			let authTimeout = setTimeout(function() {
				sock.close();
			}, 10000);

			sock.on("message", function(json) {
				let msg = JSON.parse(json);
				
				switch (state) {
					case State.WAITING_ROOM:
						switch (sock.state) {
							case State.AUTH:
								if (msg[0] == CLIENT_TYPE_PLAYER) {
									clearTimeout(authTimeout);

									sock.player = {};

									sock.player.id = nextPlayerId;
									nextPlayerId++;

									sock.player.answers = [];
									sock.player.pseudo = "un inconnu";

									let players = [];

									for (let playerSock of playersSocks) {
										players.push(playerSock.player);
										playerSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
									}

									players.push(sock.player);

									for(let screenSock of screensSocks) {
										screenSock.send(JSON.stringify([ADD_PLAYER]));
									}

									sock.send(JSON.stringify([MIN_PLAYER, players, sock.player.id]));
									sock.state = State.PSEUDO;

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
								} else if (msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY) {
									clearTimeout(authTimeout);

									sock.send(JSON.stringify([MIN_PLAYER, playersSocks.length]));
									sock.state = State.NONE;

									screensSocks.push(sock);
								} else {
									sock.close();
								}

								break;

							case State.PSEUDO:
								let isPseudoFree = true;

								for (let playerSock of playersSocks) {
									if (msg[0] == playerSock.player.pseudo) {
										isPseudoFree = false;
										break;
									}
								}

								if (isPseudoFree) {
									sock.player.pseudo = msg[0];

									for (let playerSock of playersSocks) {
										playerSock.send(JSON.stringify([SET_PSEUDO, sock.player.id, sock.player.pseudo]));
									}

									sock.state = State.NONE;
								} else {
									sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
								}

								break;
						}

						break;

					case State.GAME:
						if(sock.player.answers[actualQuestion] === undefined && msg[0] >= 0 && msg[0] <= 3) { // si le joueur n'a pas encore donné de réponse et si le code de réponse est 0, 1, 2 ou 3
							sock.player.answers[actualQuestion] = msg[0] // on enregistre la réponse envoyée par le joueur

							answerStats[sock.player.answers[actualQuestion]]++;

							let percentStats = [];

							for(let i = 0; i < answerStats.length; i++) {
								percentStats[i] = answerStats[i] / playersSocks.length * 100;
							}

							for(let playerSock of playersSocks) {
								if(playerSock.player.answers[actualQuestion] !== undefined) { // on envoit seulements les statistiques de réponse aux joueurs ayant déjà répondu à la question
									playerSock.send(JSON.stringify([ANSWERS_STATS, percentStats]));
								}
							}
						}

						break;
				}
			});

			sock.on("close", function() {
				if(sock.player === undefined) {
					screensSocks.splice(screensSocks.indexOf(sock), 1);
				} else {
					playersSocks.splice(playersSocks.indexOf(sock), 1);
				}

				if(state == State.WAITING_ROOM) {
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
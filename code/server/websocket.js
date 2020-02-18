"use strict";

const fs = require("fs");
const ws = require("ws");

//Changer l'état à true pour aller plus vite
const TEST_MODE = false;

const CLIENT_TYPE_PLAYER = 0,
	CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 1,
	DEL_PLAYER = 2,
	PSEUDO_OK = 3,
	PSEUDO_ALREADY_USED = 4,
	START_GAME_COUNTDOWN = 5;

const NEW_QUESTION = 0,
	END_GAME = 1;

const ANSWERS_STATS = 0,
	END_QUESTION = 1;

const WAIT_NOTHING = 0,
	WAIT_AUTH = 1,
	WAIT_PSEUDO = 2,
	WAIT_ANSWER = 3;

const questions = JSON.parse(fs.readFileSync("ressources/questions.json"))

if (!TEST_MODE) {
	questions.sort(function () {
		return .5 - Math.random();
	});
}

const pseudo_Possibilities = JSON.parse(fs.readFileSync("ressources/pseudos.json"));

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const MIN_PLAYER = TEST_MODE ? 1 : 4;
const GAME_COUNT_DOWN_TIME = TEST_MODE ? 5 : 15;

const nbQuestions = TEST_MODE ? 1 : 5;
module.exports = function (httpServer) {
	const wss = new ws.Server({ server: httpServer });

	const playersSocks = []; // tableau de tous les joueurs
	const waitingRoomSocks = []; // tableau des personnes se trouvant en salle d'attente qui recoivent les évènements de salle d'attente ("bidule s'est connecté", "machin s'est déconnecté")
	const screensSocks = []; // tableau de tous les écrans d'affichage connectés au serveur

	let gameRunning = false;
	let questionRunning = false;
	let startCountdownRunning = false;
	let nextPlayerId = 0;
	let actualQuestion = -1;
	let questionEndTime;

	function nextQuestion() {
		actualQuestion++;

		for(let i = 0; i < waitingRoomSocks.length; i++) {
			if(waitingRoomSocks[i].isPlayer) {
				waitingRoomSocks.splice(i, 1);
				i--; // pour éviter de sauter des élements du tableau
			}
		}

		if (actualQuestion == nbQuestions) {
			// REPERE 1
			// Envois des questions joueurs+écrans 

			let scores = [];

			for(let i = 0; i < playersSocks.length; i++) {
				scores[i] = {
					"pseudo": playersSocks[i].player.pseudo,
					"score": playersSocks[i].player.score
				}
			}

			scores.sort(function(a, b) {
				return b.score - a.score;
			})

			let screensSocksScores = [END_GAME, playersSocks.length];

			for (let i = 0; i < playersSocks.length; i++) {
				playersSocks[i].send(JSON.stringify([END_GAME, playersSocks[i].player.score]));

				screensSocksScores[2 + i * 2] = scores[i].pseudo;
				screensSocksScores[3 + i * 2] = scores[i].score;
			}

			for (let screenSock of screensSocks) {
				screenSock.send(JSON.stringify(screensSocksScores));
			}
		} else {
			// REPERE 2
			// Envois des questions joueurs+écrans 

			let question = questions[actualQuestion];

			for (let playerSock of playersSocks) {
				playerSock.send(JSON.stringify([NEW_QUESTION, question.time])); // on envoit uniquement le temps de la question aux joueurs, l'intitulé de la question sera affiché sur les grands écrans
				playerSock.state = WAIT_ANSWER;
			}

			let screenSockQuestion = [NEW_QUESTION, question.title];

			for (let i = 0; i < 4; i++) {
				screenSockQuestion[2 + i] = question.answers[i];
			}

			screenSockQuestion[6] = question.time;

			questionEndTime = Date.now() + question.time * 1000;

			for (let screenSock of screensSocks) {
				screenSock.send(JSON.stringify(screenSockQuestion));
			}

			questionRunning = true;

			let questionCountdown = setTimeout(function () {
				//REPERE 3

				questionRunning = false;

				for (let screenSock of screensSocks) {
					screenSock.send(JSON.stringify([question.correctAnswer]));
				}

				for (let playerSock of playersSocks) {
					playerSock.send(JSON.stringify([END_QUESTION, question.correctAnswer])); // on envoit la bonne réponse aux joueurs
					playerSock.state = WAIT_NOTHING;
				}

				let time = TEST_MODE ? 1000 : 6000;
				setTimeout(nextQuestion, time);
			}, question.time * 1000);
		}
	}

	wss.on("connection", function (sock) {
		sock.state = WAIT_AUTH;

		sock.on("message", function (json) {
			let msg = JSON.parse(json);

			switch (sock.state) {
				case WAIT_AUTH: {
					if(msg[0] == CLIENT_TYPE_PLAYER) {
						let random1 = Math.floor(Math.random() * (pseudo_Possibilities.names.length - 1));
						let random2 = Math.floor(Math.random() * (pseudo_Possibilities.adjectives.length - 1));

						let pseudoPart1 = pseudo_Possibilities.names[random1];
						let pseudoPart2 = pseudo_Possibilities.adjectives[random2];

						let pseudoSuggestion = `${pseudoPart1} ${pseudoPart2}`; // on génère une proposition de pseudo au joueur qu'il pourra confirmer ou changer

						// format de la trame sérialisée gameInfo : suggestion de pseudo, nombre de joueur, id, "pseudo", id, "pseudo"...

						let gameInfo = [pseudoSuggestion, playersSocks.length];

						for (let i = 0; i < playersSocks.length; i++) {
							gameInfo[2 + i * 2] = playersSocks[i].player.id;
							gameInfo[3 + i * 2] = playersSocks[i].player.pseudo;
						}

						sock.send(JSON.stringify(gameInfo));
						waitingRoomSocks.push(sock);

						sock.state = WAIT_PSEUDO;
					} else if(msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY) {
						//REPERE 10
						sock.send(JSON.stringify([MIN_PLAYER, playersSocks.length]));
						sock.state = WAIT_NOTHING;
						screensSocks.push(sock);
					}

					break;
				}

				case WAIT_PSEUDO: {
					let isPseudoFree = true;

					for (let playerSock of playersSocks) {
						if (msg[0] == playerSock.player.pseudo) {
							isPseudoFree = false;
							break;
						}
					}

					if(isPseudoFree) {
						sock.isPlayer = true;
						sock.player = {};

						sock.player.id = nextPlayerId;
						sock.player.pseudo = msg[0];
						sock.player.score = 0;

						nextPlayerId++;

						sock.player.answers = [];

						playersSocks.push(sock);

						sock.send(JSON.stringify([PSEUDO_OK, sock.player.id]));

						if(!gameRunning) {
							for(let screenSock of screensSocks) {
								screenSock.send(JSON.stringify([ADD_PLAYER]));
							}
						}

						for(let waitingRoomSock of waitingRoomSocks) {
							if(waitingRoomSock != sock) {
								waitingRoomSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
							}
						}

						if(!gameRunning && !startCountdownRunning && playersSocks.length >= MIN_PLAYER) {
							for (let screenSock of screensSocks) {
								screenSock.send(JSON.stringify([START_GAME_COUNTDOWN, GAME_COUNT_DOWN_TIME]));
							}

							let startCountdown = setTimeout(function () {
								startCountdownRunning = false;
								gameRunning = true;
								nextQuestion(); // on envoit la première question
							}, GAME_COUNT_DOWN_TIME * 1000); // quand on a assez de joueurs on lance la partie dans 15 secondes

							startCountdownRunning = true;
						} else if(questionRunning) {
							waitingRoomSocks.splice(waitingRoomSocks.indexOf(sock), 1);

							let remainingQuestionTime = Math.floor((questionEndTime - Date.now()) / 1000);

							sock.send(JSON.stringify([NEW_QUESTION, remainingQuestionTime]));
							sock.state = WAIT_ANSWER;
						}
					} else {
						sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
					}

					break;
				}

				case WAIT_ANSWER: {
					if (sock.player.answers[actualQuestion] === undefined && msg[0] >= 0 && msg[0] <= 3) { // si le joueur n'a pas encore donné de réponse et si le code de réponse est 0, 1, 2 ou 3
						if (msg[0] == questions[actualQuestion].correctAnswer) {
							let questionCoefficient = 15 / questions[actualQuestion].time;
							sock.player.score += (questionEndTime - Date.now()) * questionCoefficient;
						}

						sock.player.answers[actualQuestion] = msg[0]; // on enregistre la réponse envoyée par le joueur

						let answerStats = [0, 0, 0, 0];

						for (let playerSock of playersSocks) {
							answerStats[playerSock.player.answers[actualQuestion]]++;
						}

						let stats = [ANSWERS_STATS];

						for (let i = 0; i < answerStats.length; i++) {
							stats[1 + i] = Math.trunc((answerStats[i] / playersSocks.length * 100) * 10) / 10;
						}

						//REPERE 8 

						for (let playerSock of playersSocks) {
							if (playerSock.player.answers[actualQuestion] !== undefined) { // on envoit seulements les statistiques de réponse aux joueurs ayant déjà répondu à la question
								playerSock.send(JSON.stringify(stats));
							}
						}
					}

					break;
				}
			}
		});

		sock.on("close", function () {
			let screensSocksIndex = screensSocks.indexOf(sock);
			let playersSocksIndex = playersSocks.indexOf(sock);
			let waitingRoomSocksIndex = waitingRoomSocks.indexOf(sock);

			if(screensSocksIndex != -1) {
				screensSocks.splice(screensSocksIndex, 1);
			} else if(playersSocksIndex != -1) {
				//REPERE 9

				playersSocks.splice(playersSocksIndex, 1);

				if(!gameRunning) {
					for(let screenSock of screensSocks) {
						screenSock.send(JSON.stringify([DEL_PLAYER]));
					}
				}

				for(let waitingRoomSock of waitingRoomSocks) {
					waitingRoomSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
				}
			} else if(waitingRoomSocksIndex != -1) {
				waitingRoomSocks.splice(waitingRoomSocksIndex, 1);
			}
		});
	});
}
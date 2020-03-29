"use strict";

const fs = require("fs");

const WAIT_NOTHING = 0,
	WAIT_ANSWER = 4;

const START_GAME = 5;

const NEW_QUESTION = 1;

const ANSWERS_STATS = 1,
	END_QUESTION = 2;

const QUESTION = 3,
	QUESTION_RESULT = 4;

module.exports = function(game) {
	let questions = JSON.parse(fs.readFileSync("ressources/questions.json"));
	let questionEndTime;
	let actualQuestion;

	game.start = function() {
		questions.sort(function() {
			return .5 - Math.random();
		});

		actualQuestion = -1;

		for(let playerSock of game.playersSocks) {
			playerSock.player.answers = [];
			playerSock.player.itsFirstQuestion = true;
		}

		function nextQuestion() {
			actualQuestion++;

			if(actualQuestion < game.conf.nbQuestions) {
				// REPERE 2
				// Envois des questions joueurs+écrans 

				game.state = QUESTION;

				let w = 0;

				while(w < game.waitingRoomSocks.length) {
					if(game.waitingRoomSocks[w].isPlayer) game.waitingRoomSocks.splice(w, 1);
					else w++; // pour éviter de sauter des élements du tableau
				}

				let question = questions[actualQuestion];

				for(let playerSock of game.playersSocks) {
					let header;

					if(playerSock.player.itsFirstQuestion) {
						header = START_GAME;
						playerSock.player.itsFirstQuestion = false;
					} else {
						header = NEW_QUESTION;
					}

					playerSock.send(JSON.stringify([header, question.time])); // on envoit uniquement le temps de la question aux joueurs, l'intitulé de la question sera affiché sur les grands écrans
					playerSock.state = WAIT_ANSWER;
				}

				let header = actualQuestion == 0 ? START_GAME : NEW_QUESTION;
				let screenSockQuestion = [header, question.title];

				for(let i = 0; i < 4; i++) {
					screenSockQuestion.push(question.answers[i]);
				}

				screenSockQuestion.push(question.time);

				questionEndTime = Date.now() + question.time * 1000;

				for(let screenSock of game.screensSocks) {
					screenSock.send(JSON.stringify(screenSockQuestion));
				}

				let questionCountdown = setTimeout(function() {
					//REPERE 3

					game.state = QUESTION_RESULT;

					for(let screenSock of game.screensSocks) {
						screenSock.send(JSON.stringify([1, question.correctAnswer])); // on envoit un 1 au début pour pas que le message ne soit interprété comme STOP_GAME
					}

					for(let playerSock of game.playersSocks) {
						playerSock.send(JSON.stringify([END_QUESTION, question.correctAnswer])); // on envoit la bonne réponse aux joueurs
						playerSock.state = WAIT_NOTHING;
					}

					setTimeout(nextQuestion, 5000); // on attend 5 secondes avant d'envoyer la prochaine question
				}, question.time * 1000);
			} else {
				game.stop();
			}
		}

		nextQuestion(); // on envoit la première question
	}

	game.onPlayerJoinInGame = function(sock) {
		sock.player.answers = [];

		if(game.state == QUESTION) {
			game.waitingRoomSocks.splice(game.waitingRoomSocks.indexOf(sock), 1);

			let remainingQuestionTime = Math.floor((questionEndTime - Date.now()) / 1000);

			sock.send(JSON.stringify([START_GAME, remainingQuestionTime]));
			sock.state = WAIT_ANSWER;
		} else {
			sock.player.itsFirstQuestion = true;
		}
	}

	game.onMessage = function(sock, msg) {
		switch(sock.state) {
			case WAIT_ANSWER: {
				if(sock.player.answers[actualQuestion] === undefined && msg[0] >= 0 && msg[0] <= 3) { // si le joueur n'a pas encore donné de réponse et si le code de réponse est 0, 1, 2 ou 3
					if(msg[0] == questions[actualQuestion].correctAnswer) {
						let questionCoefficient = 15 / questions[actualQuestion].time;
						sock.player.score += (questionEndTime - Date.now()) * questionCoefficient;
					}

					sock.player.answers[actualQuestion] = msg[0]; // on enregistre la réponse envoyée par le joueur

					let answerStats = [0, 0, 0, 0];

					for(let playerSock of game.playersSocks) {
						answerStats[playerSock.player.answers[actualQuestion]]++;
					}

					let stats = [ANSWERS_STATS];

					for(let i = 0; i < answerStats.length; i++) {
						stats[1 + i] = Math.trunc((answerStats[i] / game.playersSocks.length * 100) * 10) / 10;
					}

					//REPERE 8 

					for(let playerSock of game.playersSocks) {
						if(playerSock.player.answers[actualQuestion] !== undefined) { // on envoit seulements les statistiques de réponse aux joueurs ayant déjà répondu à la question
							playerSock.send(JSON.stringify(stats));
						}
					}
				}

				break;
			}
		}
	}
}
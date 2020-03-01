"use strict";

module.exports = {};
let game = module.exports;

const server = require("./websocket.js");

const fs = require("fs");

const WAIT_NOTHING = 0,
	WAIT_ANSWER = 4;

const NEW_QUESTION = 6;

const ANSWERS_STATS = 0,
	END_QUESTION = 1;

const QUESTION = 3,
	QUESTION_RESULT = 4;

const questions = JSON.parse(fs.readFileSync("ressources/questions.json"));

let actualQuestion;
let questionEndTime;

function nextQuestion() {
	actualQuestion++;

	for(let i = 0; i < server.waitingRoomSocks.length; i++) {
		if(server.waitingRoomSocks[i].isPlayer) {
			server.waitingRoomSocks[i].player.answers = [];
		}
	}

	server.clearWaitingRoom();

	if (actualQuestion == /*questions.length*/1) {
		server.endGame();
	} else {
		// REPERE 2
		// Envois des questions joueurs+écrans 

		server.gameState = QUESTION;

		let question = questions[actualQuestion];

		for (let playerSock of server.playersSocks) {
			playerSock.send(JSON.stringify([NEW_QUESTION, question.time])); // on envoit uniquement le temps de la question aux joueurs, l'intitulé de la question sera affiché sur les grands écrans
			playerSock.state = WAIT_ANSWER;
		}

		let screenSockQuestion = [NEW_QUESTION, question.title];

		for (let i = 0; i < 4; i++) {
			screenSockQuestion[2 + i] = question.answers[i];
		}

		screenSockQuestion[6] = question.time;

		questionEndTime = Date.now() + question.time * 1000;

		for (let screenSock of server.screensSocks) {
			screenSock.send(JSON.stringify(screenSockQuestion));
		}

		let questionCountdown = setTimeout(function () {
			//REPERE 3

			server.gameState = QUESTION_RESULT;

			for (let screenSock of server.screensSocks) {
				screenSock.send(JSON.stringify([question.correctAnswer]));
			}

			for (let playerSock of server.playersSocks) {
				playerSock.send(JSON.stringify([END_QUESTION, question.correctAnswer])); // on envoit la bonne réponse aux joueurs
				playerSock.state = WAIT_NOTHING;
			}

			let time = 6000;
			setTimeout(nextQuestion, time);
		}, question.time * 1000);
	}
}

game.start = function() {
	questions.sort(function () {
		return .5 - Math.random();
	});

	actualQuestion = -1;

	nextQuestion(); // on envoit la première question
}

game.onPlayerJoinInGame = function(sock) {
	if(server.gameState == QUESTION) {
		server.waitingRoomSocks.splice(server.waitingRoomSocks.indexOf(sock), 1);

		let remainingQuestionTime = Math.floor((questionEndTime - Date.now()) / 1000);

		sock.player.answers = [];

		sock.send(JSON.stringify([NEW_QUESTION, remainingQuestionTime]));
		sock.state = WAIT_ANSWER;
	}
}

game.onMessage = function(sock, msg) {
	switch(sock.state) {
		case WAIT_ANSWER: {
			if (sock.player.answers[actualQuestion] === undefined && msg[0] >= 0 && msg[0] <= 3) { // si le joueur n'a pas encore donné de réponse et si le code de réponse est 0, 1, 2 ou 3
				if (msg[0] == questions[actualQuestion].correctAnswer) {
					let questionCoefficient = 15 / questions[actualQuestion].time;
					sock.player.score += (questionEndTime - Date.now()) * questionCoefficient;
				}

				sock.player.answers[actualQuestion] = msg[0]; // on enregistre la réponse envoyée par le joueur

				let answerStats = [0, 0, 0, 0];

				for (let playerSock of server.playersSocks) {
					answerStats[playerSock.player.answers[actualQuestion]]++;
				}

				let stats = [ANSWERS_STATS];

				for (let i = 0; i < answerStats.length; i++) {
					stats[1 + i] = Math.trunc((answerStats[i] / server.playersSocks.length * 100) * 10) / 10;
				}

				//REPERE 8 

				for (let playerSock of server.playersSocks) {
					if (playerSock.player.answers[actualQuestion] !== undefined) { // on envoit seulements les statistiques de réponse aux joueurs ayant déjà répondu à la question
						playerSock.send(JSON.stringify(stats));
					}
				}
			}

			break;
		}
	}
}
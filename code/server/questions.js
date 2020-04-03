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

const NEW_SCREEN = 6;

module.exports = function (game) {
	let questions = JSON.parse(fs.readFileSync("ressources/questions.json")); // on récupère le fichier contenant les questions
	let questionEndTime; // date à laquelle la question prend fin
	let actualQuestion; // numéro de la question actuelle

	game.start = function () { // fonction déclenché par websocket.js pour démarrer le jeu
		questions.sort(function () {
			return .5 - Math.random(); // on mélange les questions
		});

		actualQuestion = -1; // on initialise à -1 pour que la prochaine question soit la première (0)

		for (let playerSock of game.playersSocks) {
			playerSock.player.answers = []; // on crée un tableau qui contiendra les réponses pour chaque joueur
			playerSock.player.itsFirstQuestion = true; // permet de savoir que la prochaine question est la première pour ce joueur
		}

		function nextQuestion() { // quand on veut envoyer la question suivante
			actualQuestion++; // on passe à la question suivante

			if (actualQuestion < game.conf.nbQuestions) { // si on est pas arrivé au bout de la partie
				// REPERE 2
				// Envois des questions joueurs+écrans 

				game.state = QUESTION; // on met l'état du jeu sur "une question est en cours"

				let w = 0;

				while (w < game.waitingRoomSocks.length) {
					if (game.waitingRoomSocks[w].isPlayer) game.waitingRoomSocks.splice(w, 1); // on retire les joueurs de la salle d'attente (ceux qui ont validé leur pseudo donc qui sont prêts à jouer)
					else w++; // pour éviter de sauter des élements du tableau
				}

				let question = questions[actualQuestion]; // on charge la question actuelle

				for (let playerSock of game.playersSocks) {
					let header;

					if (playerSock.player.itsFirstQuestion) {
						header = START_GAME; // si c'est la première question du joueur, on l'envoie avec le message "début de partie"
						playerSock.player.itsFirstQuestion = false;
					} else {
						header = NEW_QUESTION; // sinon, on envoie la question avec le message "question suivante"
					}

					playerSock.send(JSON.stringify([header, question.time])); // on envoie uniquement le temps de la question aux joueurs, l'intitulé de la question sera affiché sur les grands écrans
					playerSock.state = WAIT_ANSWER; // on passe l'état du joueur à "en attente d'une réponse"
				}

				let header = actualQuestion == 0 ? START_GAME : NEW_QUESTION; // on choisit le type de message pour les écrans comme pour les joueurs juste avant
				let screenSockQuestion = [header, question.title]; // on prépare le message contenant la question

				for (let i = 0; i < 4; i++) {
					screenSockQuestion.push(question.answers[i]); // on ajoute chaque réponse de la question au message
				}

				screenSockQuestion.push(question.time); // on ajoute le temps de réponse

				screenSockQuestion.push(actualQuestion + 1);

				questionEndTime = Date.now() + question.time * 1000; // on calcule la date de fin de la question

				for (let screenSock of game.screensSocks) {
					screenSock.send(JSON.stringify(screenSockQuestion)); // on envoie les questions aux grands écrans
				}

				let questionCountdown = setTimeout(function () { // on lance un décompte de fin de question
					//REPERE 3

					game.state = QUESTION_RESULT; // on passe l'état du jeu à "affichage des résultats"

					for (let screenSock of game.screensSocks) { // on envoie à tous les grands écrans la bonne réponse
						screenSock.send(JSON.stringify([1, question.correctAnswer])); // on envoie un 1 au début pour pas que le message ne soit interprété comme STOP_GAME
					}

					for (let playerSock of game.playersSocks) {
						playerSock.send(JSON.stringify([END_QUESTION, question.correctAnswer])); // on envoie la bonne réponse aux joueurs
						playerSock.state = WAIT_NOTHING;
					}

					setTimeout(nextQuestion, 5000); // on attend 5 secondes avant d'envoyer la prochaine question
				}, question.time * 1000); // temps de réponse propre à la question
			} else {
				game.stop(); // si on est arrivé au bout des questions, on arrête la partie
			}
		}

		nextQuestion(); // on envoie la première question
	}

	game.onPlayerJoinInGame = function (sock) { // quand un joueur rejoint en cours de partie
		sock.player.answers = []; // on crée son tableau de réponses

		if (game.state == QUESTION) { // si on est en pleine question
			game.waitingRoomSocks.splice(game.waitingRoomSocks.indexOf(sock), 1); // on le retire de la salle d'attente

			let remainingQuestionTime = Math.floor((questionEndTime - Date.now()) / 1000); // on calcule le temps restant avant la fin de la question

			sock.send(JSON.stringify([START_GAME, remainingQuestionTime])); // on envoie un message de début de partie au joueur avec le temps restant de la question en cours
			sock.state = WAIT_ANSWER; // on passe la socket en attente d'une réponse
		} else {
			sock.player.itsFirstQuestion = true; // si on est pas en cours de question, on se prépare à faire entrer le joueur à la prochaine question
		}
	}

	game.onScreenJoinInGame = function (sock, msg) {

		let question = questions[actualQuestion];

		let header = actualQuestion == 0 ? START_GAME : NEW_QUESTION; // on choisit le type de message pour les écrans comme pour les joueurs juste avant
		let screenSockQuestion = [header, question.title]; // on prépare le message contenant la question

		for (let i = 0; i < 4; i++) {
			screenSockQuestion.push(question.answers[i]); // on ajoute chaque réponse de la question au message
		}

		let remainingQuestionTime = Math.floor((questionEndTime - Date.now()) / 1000); // on calcule le temps restant avant la fin de la question
		screenSockQuestion.push(remainingQuestionTime); // on ajoute le temps de réponse

		screenSockQuestion.push(actualQuestion + 1);

		sock.send(JSON.stringify(screenSockQuestion)); // on envoie un message de début de partie au joueur avec le temps restant de la question en cours

		sock.send(JSON.stringify([NEW_SCREEN, game.state, screenSockQuestion]));

	}

	game.onPlayerLeftInGame = function (sock) {

	}

	game.onMessage = function (sock, msg) { // quand on reçoit un message du joueur

		switch (sock.state) {
			case WAIT_ANSWER: { // quand on est en attente d'une réponse
				if (sock.player.answers[actualQuestion] === undefined && msg[0] >= 0 && msg[0] <= 3) { // si le joueur n'a pas encore donné de réponse et si le code de réponse est 0, 1, 2 ou 3
					if (msg[0] == questions[actualQuestion].correctAnswer) { // si le joueur a envoyé la bonne réponse
						let questionCoefficient = 15 / questions[actualQuestion].time;
						sock.player.score += (questionEndTime - Date.now()) * questionCoefficient; // on augmente son score
					}

					sock.player.answers[actualQuestion] = msg[0]; // on enregistre la réponse envoyée par le joueur

					let answerStats = [0, 0, 0, 0]; // on prépare les nouvelles statistiques de réponses

					for (let playerSock of game.playersSocks) {
						answerStats[playerSock.player.answers[actualQuestion]]++; // on ajoute chaque réponse aux statistiques
					}

					let stats = [ANSWERS_STATS];

					for (let i = 0; i < answerStats.length; i++) {
						stats[1 + i] = Math.trunc((answerStats[i] / game.playersSocks.length * 100) * 10) / 10;
					}

					//REPERE 8 

					for (let playerSock of game.playersSocks) {
						if (playerSock.player.answers[actualQuestion] !== undefined) { // on envoie seulements les statistiques de réponse aux joueurs ayant déjà répondu à la question
							playerSock.send(JSON.stringify(stats));
						}
					}
				}

				break;
			}
		}
	}
}
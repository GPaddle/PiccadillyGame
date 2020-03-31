"use strict";

const NEW_QUESTION = 1;

const ANSWERS_STATS = 1,
	END_QUESTION = 2;

const WAIT_QUESTION = 2,
	WAIT_QUESTION_EVENT = 3;

export default function (game) {
	let chosenAnswer;
	let questionCountdown;

	function onNewQuestion (msg) { // quand on reçoit une nouvelle question
		if (chosenAnswer !== undefined) {
			let clickedAnswerButton = document.getElementsByClassName("answer-button")[chosenAnswer];
			clickedAnswerButton.style.border = ""; // on décoche le bouton de la réponse précemment sélectionnée
		}

		chosenAnswer = undefined; // permet de dire qu'aucune réponse n'a encore été sélectionnée

		let answersStats = document.getElementsByClassName("answer-stat");
		let answersStatsBars = document.getElementsByClassName("answer-stat-bar");

		for (let i = 0; i < 4; i++) {
			answersStats[i].innerHTML = ""; // on efface les statistiques de réponse de la question précédente
			answersStatsBars[i].style.width = "";
		}

		let answersButtons = document.getElementsByClassName("answer-button");

		for (let answerButton of answersButtons) {
			answerButton.style.backgroundColor = ""; // on efface les couleurs de bonnes ou mauvaises réponses
		}

		clearInterval(questionCountdown); // on efface le décompte de la question précédente

		let time = msg[1];

		let questionInfo = document.getElementById("question-info");
		questionInfo.innerHTML = "Temps restant : <span id=\"question-countdown\"></span>"; // on lance le décompte de fin de question

		let questionCountdownSpan = document.getElementById("question-countdown");
		questionCountdownSpan.innerHTML = time;

		questionCountdown = setInterval(function () {
			time--;
			questionCountdownSpan.innerHTML = time; // on met à jour le décompte

			if (time == 0) {
				clearTimeout(questionCountdown); // on efface le décompte quand il arrive à 0
			}
		}, 1000);

		game.state = WAIT_QUESTION_EVENT;
	}

	game.onStart = function (msg) { // quand la partie commence
		document.body.innerHTML = `
		<div id="question-number">Question</div>
		<div id="question-info"></div>
		<div class="answer-button">
			<div class="answer-stat-bar"></div>
			<div class="answer-button-content">
				<div class="answer-letter">A</div>
				<div class="answer-stat">0%</div>
			</div>
		</div>
		<div class="answer-button">
			<div class="answer-stat-bar"></div>
			<div class="answer-button-content">
				<div class="answer-letter">B</div>
				<div class="answer-stat">0%</div>
			</div>
		</div>
		<div class="answer-button">
			<div class="answer-stat-bar"></div>
			<div class="answer-button-content">
				<div class="answer-letter">C</div>
				<div class="answer-stat">0%</div>
			</div>
		</div>
		<div class="answer-button">
			<div class="answer-stat-bar"></div>
			<div class="answer-button-content">
				<div class="answer-letter">D</div>
				<div class="answer-stat">0%</div>
			</div>
		</div>
		`; // on affiche l'interface de réponse

		let answersButtons = document.getElementsByClassName("answer-button");

		for (let i = 0; i < 4; i++) {
			answersButtons[i].addEventListener("click", function () { // quand on clique sur un des boutons de réponse
				if (chosenAnswer === undefined && game.state == WAIT_QUESTION_EVENT) {
					chosenAnswer = i;
					answersButtons[chosenAnswer].style.border = "solid 2px #fefefe"; // on entoure le bouton d'un halo blanc

					//REPERE 3
					game.sock.send(JSON.stringify([chosenAnswer])); // on envoit le numéro de la réponse sélectionnée
				}
			});
		}

		onNewQuestion(msg); // on traîte la première question
	}

	game.onMessage = function (msg) {
		switch (game.state) {
			case WAIT_QUESTION: { // quand on reçoit une questions
				if (msg[0] == NEW_QUESTION) {
					onNewQuestion(msg); // on traîte cette question
				}

				break;
			}

			case WAIT_QUESTION_EVENT: { // quand on attend des évènements après avoir reçu la question
				if (msg[0] == ANSWERS_STATS) { // quand on reçoit des statistiques de réponse
					let answersStats = document.getElementsByClassName("answer-stat");
					let answersStatsBars = document.getElementsByClassName("answer-stat-bar")

					for (let i = 0; i < answersStats.length; i++) {
						answersStats[i].innerHTML = msg[1 + i] + "%"; // on affiche les stats
						answersStatsBars[i].style.width = msg[1 + i] + "%";
					}
				} else if (msg[0] == END_QUESTION) { // quand la question se termine
					let answersButtons = document.getElementsByClassName("answer-button");

					for (let answerButton of answersButtons) {
						answerButton.backgroundColor = "#a65050"; // on colore toutes les réponses en rouge
					}

					answersButtons[msg[1]].style.backgroundColor = "#22780F"; // sauf la réponse juste (en vert)

					let questionInfo = document.getElementById("question-info");

					if (chosenAnswer == msg[1]) {
						questionInfo.innerHTML = "Bonne réponse !"; // on affiche bonne réponse ou mauvaise réponse en fonction du résultat reçu
					} else {
						questionInfo.innerHTML = "Mauvaise réponse...";
					}

					game.state = WAIT_QUESTION;
				}

				break;
			}
		}
	}
}
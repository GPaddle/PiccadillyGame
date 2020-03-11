"use strict";

const ANSWERS_STATS = 0,
	END_QUESTION = 1;

const NEW_QUESTION = 6;

function initGame(game) {
	let chosenAnswer;
	let questionCountdown;

	game.onNewQuestion = function(msg) {
		if(chosenAnswer !== undefined) {
			let clickedAnswerButton = document.getElementsByClassName("answer-button")[chosenAnswer];
			clickedAnswerButton.style.border = "";
		}

		chosenAnswer = undefined;

		let answersStats = document.getElementsByClassName("answer-stat");
		let answersStatsBars = document.getElementsByClassName("answer-stat-bar");

		for (let i = 0; i < 4; i++) {
			answersStats[i].innerHTML = "";
			answersStatsBars[i].style.width = "";
		}

		let questionNumber = document.getElementById("question-number");

		let answersButtons = document.getElementsByClassName("answer-button");

		for (let answerButton of answersButtons) {
			answerButton.style.backgroundColor = "";
		}

		clearInterval(questionCountdown);

		let time = msg[1];

		let questionInfo = document.getElementById("question-info");
		questionInfo.innerHTML = "Temps restant : <span id=\"question-countdown\"></span>"

		let questionCountdownSpan = document.getElementById("question-countdown");
		questionCountdownSpan.innerHTML = time;

		questionCountdown = setInterval(function () {
			time--;
			questionCountdownSpan.innerHTML = time;

			if (time == 0) {
				clearTimeout(questionCountdown);
			}
		}, 1000);

		game.state = WAIT_QUESTION_EVENT;
	}

	game.onWaitingRoomMessage = function(msg) {
		if(msg[0] == NEW_QUESTION) {
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
			`;

			let answersButtons = document.getElementsByClassName("answer-button");

			for (let i = 0; i < 4; i++) {
				answersButtons[i].addEventListener("click", function () {
					if (chosenAnswer === undefined && game.state == WAIT_QUESTION_EVENT) {
						chosenAnswer = i;
						answersButtons[chosenAnswer].style.border = "solid 2px #fefefe";

						//REPERE 3
						game.sock.send(JSON.stringify([chosenAnswer])); // on envoit le numéro de la réponse sélectionnée
					}
				});
			}

			game.onNewQuestion(msg);
		}
	}

	game.onMessage = function(msg) {
		switch(game.state) {
			case WAIT_QUESTION: {
				if (msg[0] == NEW_QUESTION) {
					game.onNewQuestion(msg);
				} else if(msg[0] == END_GAME) {
					game.endGame(msg);
				}

				break;
			}

			case WAIT_QUESTION_EVENT: {
				if (msg[0] == ANSWERS_STATS) {
					let answersStats = document.getElementsByClassName("answer-stat");
					let answersStatsBars = document.getElementsByClassName("answer-stat-bar")

					for (let i = 0; i < answersStats.length; i++) {
						answersStats[i].innerHTML = msg[1 + i] + "%";
						answersStatsBars[i].style.width = msg[1 + i] + "%";
					}
				} else if (msg[0] == END_QUESTION) {
					let answersButtons = document.getElementsByClassName("answer-button");

					for (let answerButton of answersButtons) {
						answerButton.backgroundColor = "#a65050";
					}

					answersButtons[msg[1]].style.backgroundColor = "#22780F";

					let questionInfo = document.getElementById("question-info");

					if (chosenAnswer == msg[1]) {
						questionInfo.innerHTML = "Bonne réponse !";
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
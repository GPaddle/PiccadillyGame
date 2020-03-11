"use strict";

const NEW_QUESTION = 6;

const WAIT_QUESTION = 2,
	WAIT_ANSWER = 3;

function initGame(game) {
	let questionNumber;
	let questionAnswers;
	let questionCountdown;

	function onNewQuestion(msg) {
		clearInterval(questionCountdown);
		questionNumber++;

		let questionNumberDiv = document.getElementById("question-number");
		questionNumberDiv.innerHTML = "Question " + questionNumber;

		let questionDiv = document.getElementById("question");
		questionDiv.innerHTML = msg[1];

		let answers = document.getElementsByClassName("answer");
		let answersText = document.getElementsByClassName("answer-text");

		questionAnswers = [];

		for(let i = 0; i < 4; i++) {
			questionAnswers[i] = msg[2 + i];

			answers[i].style.backgroundColor = "";
			answersText[i].innerHTML = questionAnswers[i];
		}

		let time = msg[6];

		let questionInfo = document.getElementById("question-info");
		questionInfo.innerHTML = "Temps restant : <span id=\"question-countdown\">" + time + "</span>";

		let questionCountdownSpan = document.getElementById("question-countdown");

		questionCountdown = setInterval(function() {
			time--;
			questionCountdownSpan.innerHTML = time;

			if(time == 0) {
				clearInterval(questionCountdown);
			}
		}, 1000);

		game.state = WAIT_ANSWER;
	}

	game.onWaitingRoomMessage = function(msg) {
		if(msg[0] == NEW_QUESTION) {
			document.body.innerHTML = `
			<div id="question-number">Question ...</div>
			<div id="question">...</div>
			<div id="question-info"></div>
			<div id="answer1" class="answer">
				<span class="answer-letter">A - </span>
				<span class="answer-text">...</div>
			</div>
			<div id="answer2" class="answer">
				<span class="answer-letter">B - </span>
				<span class="answer-text">...</div>
			</div>
			<div id="answer3" class="answer">
				<span class="answer-letter">C - </span>
				<span class="answer-text">...</div>
			</div>
			<div id="answer4" class="answer">
				<span class="answer-letter">D - </span>
				<span class="answer-text">...</div>
			</div>
			`;

			questionNumber = 0;

			onNewQuestion(msg);
		}
	}

	game.onMessage = function(msg) {
		switch(game.state) {
			case WAIT_QUESTION: {
				if(msg[0] == NEW_QUESTION) {
					onNewQuestion(msg);
				} else if(msg[0] == END_GAME) {
					game.endGame(msg);
				}

				break;

			}

			case WAIT_ANSWER: {
				let questionInfo = document.getElementById("question-info");
				questionInfo.innerHTML = "La bonne réponse était \"" + questionAnswers[msg[0]] + "\"";

				let answers = document.getElementsByClassName("answer");

				for(let answer of answers) {
					answer.style.backgroundColor = "#bb0b0b";
				}

				answers[msg[0]].style.backgroundColor = "#22780f";

				game.state = WAIT_QUESTION;
				break;
			}
		}
	}
}
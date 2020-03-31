"use strict";

const NEW_QUESTION = 1;

const WAIT_QUESTION = 2,
	WAIT_ANSWER = 3;

export default function (game) {
	let questionNumber;
	let questionAnswers;
	let questionCountdown;

	function onNewQuestion(msg) { // quand on reçoit une nouvelle question
		clearInterval(questionCountdown); // on supprime le compte à rebours de la question précédente
		questionNumber++; // on incrémente le numéro de la question en cours

		let questionNumberDiv = document.getElementById("question-number");
		questionNumberDiv.innerHTML = "Question " + questionNumber; // on affiche le numéro de la nouvelle question

		let questionDiv = document.getElementById("question");
		questionDiv.innerHTML = msg[1]; // on affiche l'intitulé de la question

		let answers = document.getElementsByClassName("answer");
		let answersText = document.getElementsByClassName("answer-text");

		questionAnswers = []; // on vide la liste des réponses posssibles

		for (let i = 0; i < 4; i++) {
			questionAnswers[i] = msg[2 + i]; // on ajoute la réponse reçue à la listes des réponses possibles

			answers[i].style.backgroundColor = ""; // on réinitialise la couleur des encadrés de réponse
			answersText[i].innerHTML = questionAnswers[i]; // on affiche les réponses
		}

		let time = msg[6]; // on récupère le temps de la question

		let questionInfo = document.getElementById("question-info");
		questionInfo.innerHTML = "Temps restant : <span id=\"question-countdown\">" + time + "</span>"; // on affiche le compte à rebours

		let questionCountdownSpan = document.getElementById("question-countdown");

		questionCountdown = setInterval(function () {
			time--;
			questionCountdownSpan.innerHTML = time; // on met à jour le compte à rebours

			if (time == 0) {
				clearInterval(questionCountdown); // quand le compte à rebours est à 0, on l'arrête
			}
		}, 1000);

		game.state = WAIT_ANSWER; // on passe à l'état "en attente de la bonne réponse"
	}

	game.onStart = function (msg) { // quand la partie commence
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
		`; // on affiche l'écran de la question

		questionNumber = 0; // on met le numéro de la question en cours à 0

		onNewQuestion(msg); // on affiche la première question
	}

	game.onMessage = function (msg) {
		switch (game.state) {
			case WAIT_QUESTION: { // quand on reçoit une question
				onNewQuestion(msg); // on l'affiche
				break;
			}

			case WAIT_ANSWER: { // quand on reçoit la bonne réponse à la question en cours
				let questionInfo = document.getElementById("question-info");
				questionInfo.innerHTML = "La bonne réponse était \"" + questionAnswers[msg[1]] + "\""; // on affiche la bonne réponse

				let answers = document.getElementsByClassName("answer");

				for (let answer of answers) {
					answer.style.backgroundColor = "#bb0b0b"; // on met tous les encadrés de réponse en rouge
				}

				answers[msg[1]].style.backgroundColor = "#22780f"; // sauf celui de la bonne réponse (en vert)

				game.state = WAIT_QUESTION; // on repasse à l'état "en attente d'une question"
				break;
			}
		}
	}
}
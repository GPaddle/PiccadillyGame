"use strict";

const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	DEL_PLAYER = 2,
	START_GAME_COUNTDOWN = 4,
	START_GAME = 5;

const NEW_QUESTION = 0,
	END_GAME = 3;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const STATE_GAME_INFO = 0,
	STATE_WAITING_ROOM = 1,
	STATE_WAIT_QUESTION = 2,
	STATE_ANSWER = 3,
	STATE_RESULTS = 4;

window.onload = function() {
	document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="join-invitation">Rejoignez la partie sur http://` + window.location.host + `/play</div>
	<div id="players-info">Nombre de joueurs connectés : <span id="players-count">0</span></div>
	<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>
	`;

	function displayGame() {
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
	}

	const sock = new WebSocket("ws://" + window.location.host);

	sock.onopen = function() {
		let state = STATE_GAME_INFO;

		let playersCount = 0;

		let questionAnswers;

		let questionNumber = 0;
		let questionCountdown;

		sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

		sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch (state) {
				case STATE_GAME_INFO: {
					let minPlayersCount = document.getElementById("min-players-count");
					minPlayersCount.innerHTML = msg[0];

					playersCount = msg[1];

					let playersCountSpan = document.getElementById("players-count");
					playersCountSpan.innerHTML = playersCount;

					state = STATE_WAITING_ROOM;
					break;
				}

				case STATE_WAITING_ROOM: {
					if(msg[0] == ADD_PLAYER) {
						playersCount++;

						let playersCountSpan = document.getElementById("players-count");
						playersCountSpan.innerHTML = playersCount;
					} else if(msg[0] == DEL_PLAYER) {
						playersCount--;

						let playersCountSpan = document.getElementById("players-count");
						playersCountSpan.innerHTML = playersCount;
					} else if(msg[0] == START_GAME_COUNTDOWN) {
						let countdownInfo = document.createElement("div");
						countdownInfo.id = "start-countdown-info";
						countdownInfo.innerHTML = "La partie commence dans ";

						let time = msg[1];

						let countdownSpan = document.createElement("span");
						countdownSpan.innerHTML = time;

						countdownInfo.appendChild(countdownSpan);

						let playersInfo = document.getElementById("players-info");
						document.body.insertBefore(countdownInfo, playersInfo);

						let countdown = setInterval(function() {
							time--;
							countdownSpan.innerHTML = time;

							if(time == 0) {
								clearInterval(countdown);
							}
						}, 1000)
					} else if(msg[0] == START_GAME) {
						displayGame();
						state = STATE_WAIT_QUESTION;
					}

					break;
				}

				case STATE_WAIT_QUESTION: {
					if(msg[0] == NEW_QUESTION) {
						clearInterval(questionCountdown);

						let answers = document.getElementsByClassName("answer");

						for(let answer of answers) {
							answer.style.backgroundColor = "";
						}

						questionAnswers = msg[1][1];

						questionNumber++;

						let questionNumberDiv = document.getElementById("question-number");
						questionNumberDiv.innerHTML = "Question " + questionNumber;

						let questionDiv = document.getElementById("question");
						questionDiv.innerHTML = msg[1][0];

						let answersText = document.getElementsByClassName("answer-text");

						for(let i = 0; i < 4; i++) {
							answersText[i].innerHTML = questionAnswers[i];
						}

						let time = msg[1][2];

						let questionInfo = document.getElementById("question-info");
						questionInfo.innerHTML = "Temps restant : <span id=\"question-countdown\">...</span>";

						let questionCountdownSpan = document.getElementById("question-countdown");
						questionCountdownSpan.innerHTML = time;

						questionCountdown = setInterval(function() {
							time--;
							questionCountdownSpan.innerHTML = time;

							if(time == 0) {
								clearInterval(questionCountdown);
							}
						}, 1000);

						state = STATE_ANSWER;
					} else if(msg[0] == END_GAME) {
						document.body.innerHTML = `
						<div id="results-header">Résultats</div>
						<div id="results"></div>
						`;

						let resultsDiv = document.getElementById("results");
						let scores = msg[1];

						for(let i = 0; i < scores.length; i++) {
							resultsDiv.innerHTML += "<div class=\"resultContener\"><span class=\"playerName\">" + scores[i][0] + "</span><span class=\"playerScore\">" + scores[i][1] + "</span></div>";
						}
					}

					break;

				}

				case STATE_ANSWER: {
					let questionInfo = document.getElementById("question-info");
					questionInfo.innerHTML = "La bonne réponse était \"" + questionAnswers[msg[0]] + "\"";

					let answers = document.getElementsByClassName("answer");

					for(let answer of answers) {
						answer.style.backgroundColor = "#bb0b0b";
					}

					answers[msg[0]].style.backgroundColor = "#22780f";

					state = STATE_WAIT_QUESTION;
					break;
				}
			}
		}
	}
}
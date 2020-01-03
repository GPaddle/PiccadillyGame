"use strict";

const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const DEL_PLAYER = 2;
const START_GAME_COUNTDOWN = 4;
const START_GAME = 5;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const State = {
	GAME_INFO: 0,
	WAITING_ROOM: 1,
	GAME: 2,
}

window.onload = function() {
	document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="join-invitation">Rejoignez la partie sur http://` + window.location.host + `/play</div>
	<div id="players-info">Nombre de joueurs connectés : <span id="players-count">0</span></div>
	<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>
	`;

	let playersInfoHtml = document.getElementById("players-info");

	let playersCountHtml = document.getElementById("players-count");
	let minPlayersCountHtml = document.getElementById("min-players-count");

	let questionNumberHtml;
	let questionHtml;

	let questionCountdownHtml;

	let answersHtml;

	function displayGame() {
		document.body.innerHTML = `
		<div id="question-number">Question ...</div>
		<div id="question">...</div>
		<div id="question-countdown-info">Temps restant : <span id="question-countdown">...</span></div>
		<div class="answer">
			<span class="answer-letter">A - </span>
			<span class="answer-text">...</div>
		</div>
		<div class="answer">
			<span class="answer-letter">B - </span>
			<span class="answer-text">...</div>
		</div>
		<div class="answer">
			<span class="answer-letter">C - </span>
			<span class="answer-text">...</div>
		</div>
		<div class="answer">
			<span class="answer-letter">D - </span>
			<span class="answer-text">...</div>
		</div>
		`;

		questionNumberHtml = document.getElementById("question-number");
		questionHtml = document.getElementById("question");

		questionCountdownHtml = document.getElementById("question-countdown");

		answersHtml = document.getElementsByClassName("answer-text");
	}

	const sock = new WebSocket("ws://" + window.location.host);

	sock.onopen = function() {
		let state = State.GAME_INFO;

		let playersCount = 0;
		let minPlayersCount = 0;

		let questionNumber = 0;
		let questionCountdown;

		sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

		sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch (state) {
				case State.GAME_INFO:
					minPlayersCount = msg[0];
					minPlayersCountHtml.innerHTML = minPlayersCount;

					playersCount = msg[1];
					playersCountHtml.innerHTML = playersCount;

					state = State.WAITING_ROOM;
					break;

				case State.WAITING_ROOM:
					if (msg[0] == ADD_PLAYER) {
						playersCount++;
						playersCountHtml.innerHTML = playersCount;
					} else if (msg[0] == DEL_PLAYER) {
						playersCount--;
						playersCountHtml.innerHTML = playersCount;
					} else if (msg[0] == START_GAME_COUNTDOWN) {
						let countdownInfoHtml = document.createElement("div");
						countdownInfoHtml.id = "start-countdown-info";
						countdownInfoHtml.innerHTML = "La partie commence dans ";

						let time = msg[1];

						let countdownHtml = document.createElement("span");
						countdownHtml.innerHTML = time;

						countdownInfoHtml.appendChild(countdownHtml);
						document.body.insertBefore(countdownInfoHtml, playersInfoHtml);

						let countdown = setInterval(function() {
							time--;
							countdownHtml.innerHTML = time;

							if(time == 0) {
								clearInterval(countdown);
							}
						}, 1000)
					} else if (msg[0] == START_GAME) {
						displayGame();
						state = State.GAME;
					}

					break;
				case State.GAME:
					clearInterval(questionCountdown);

					questionNumber++;
					questionNumberHtml.innerHTML = "Question " + questionNumber;

					questionHtml.innerHTML = msg[0];

					for(let i = 0; i < 4; i++) {
						answersHtml[i].innerHTML = msg[1][i];
					}

					let time = msg[3];
					questionCountdownHtml.innerHTML = time;

					questionCountdown = setInterval(function() {
						time--;
						questionCountdownHtml.innerHTML = time;

						if(time == 0) {
							clearInterval(questionCountdown);
						}
					}, 1000);
					break;
			}
		}
	}
}
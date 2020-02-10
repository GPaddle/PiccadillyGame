"use strict";

const CLIENT_TYPE_PLAYER = 0;

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
	WAIT_GAME_INFO = 1,
	WAIT_WAITING_ROOM_EVENT = 2,
	WAIT_QUESTION = 3,
	WAIT_QUESTION_EVENT = 4;

window.onload = function () {
	document.body.innerHTML = `
	<div id="player-pseudo-info">Votre pseudo :</div>
	<input id="pseudo-input" type="text" placeholder="Entrez votre pseudo" required autofocus>
	<div id="game-info"></div>
	<div id="join-button">Rejoindre la partie</div>

	<div id="players-list-header">Joueurs connectés</div>
	<div id="players-list">

	</div>
	`;

	let pseudoError = false;

	let pseudoInput = document.getElementById("pseudo-input");
	pseudoInput.onfocus = function () {
		if(pseudoError) {
			let gameInfo = document.getElementById("game-info");
			gameInfo.innerHTML = "";
			pseudoError = false;
		}
	}

	let joinButton = document.getElementById("join-button");
	joinButton.onclick = function () {
		//REPERE 1
		sock.send(JSON.stringify([pseudoInput.value]));
	};

	let sock = new WebSocket("ws://" + window.location.host);

	sock.onopen = function () {
		let state = WAIT_GAME_INFO;
		let players; // tableau des pseudos de joueurs

		let questionCountdown;

		let chosenAnswer;

		//REPERE 2
		sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

		function displayGame() {
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
				answersButtons[i].onclick = function () {
					if (chosenAnswer === undefined && state == WAIT_QUESTION_EVENT) {
						chosenAnswer = i;
						answersButtons[chosenAnswer].style.border = "solid 2px #fefefe";

						//REPERE 3
						sock.send(JSON.stringify([chosenAnswer])); // on envoit le numéro de la réponse sélectionnée
					}
				}
			}
		}

		sock.onmessage = function (json) {
			let msg = JSON.parse(json.data);

			function onNewQuestion() {
				if (chosenAnswer !== undefined) {
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

				state = WAIT_QUESTION_EVENT;
			}

			switch (state) {
				case WAIT_GAME_INFO: {
					let pseudoInput = document.getElementById("pseudo-input");
					pseudoInput.value = msg[0];

					let playersCount = msg[1];

					players = [];
					let playersList = document.getElementById("players-list");

					for (let i = 0; i < playersCount; i++) {
						players[i] = {};
						players[i].id = msg[2 + i * 2];
						players[i].pseudo = msg[3 + i * 2];

						players[i].line = document.createElement("div");
						players[i].line.classList.add("players-list-player");
						players[i].line.innerHTML = players[i].pseudo;

						playersList.appendChild(players[i].line);
					}

					state = WAIT_WAITING_ROOM_EVENT;
					break;
				}

				case WAIT_WAITING_ROOM_EVENT: {
					function addPlayer(id, pseudo) {
						let player = {id: id, pseudo: pseudo};

						player.line = document.createElement("div");
						player.line.classList.add("players-list-player");
						player.line.innerHTML = player.pseudo;

						let playersList = document.getElementById("players-list");
						playersList.appendChild(player.line);

						players.push(player);
					}

					if (msg[0] == ADD_PLAYER) {
						addPlayer(msg[1], msg[2]);
					} else if (msg[0] == DEL_PLAYER) {
						for (let player of players) {
							if (player.id == msg[1]) {
								player.line.remove();
								players.splice(players.indexOf(player), 1);

								let playersCount = document.getElementById("players-count");
								playersCount.innerHTML = players.length;
							}
						}
					} else if(msg[0] == PSEUDO_OK) {
						let pseudoInput = document.getElementById("pseudo-input");
						addPlayer(msg[1], pseudoInput.value);

						let joinButton = document.getElementById("join-button");
						let gameInfo = document.getElementById("game-info");

						document.body.removeChild(joinButton);
						gameInfo.innerHTML = "En attente du début de la partie";
						pseudoInput.readOnly = true;
					} else if (msg[0] == PSEUDO_ALREADY_USED) {
						let gameInfo = document.getElementById("game-info");
						gameInfo.innerHTML = "Ce pseudo est déjà utilisé";
						pseudoError = true;
					} else if (msg[0] == START_GAME_COUNTDOWN) {
						let gameInfo = document.getElementById("game-info");
						let joinButton = document.getElementById("join-button");

						let countdownSpan = document.createElement("span");
						countdownSpan.id = "start-countdown";
						countdownSpan.innerHTML = msg[1];

						gameInfo.innerHTML = "La partie commence dans ";
						gameInfo.appendChild(countdownSpan);

						let time = msg[1];

						let countdown = setInterval(function () {
							time--;
							countdownSpan.innerHTML = time;

							if (time == 0) {
								clearInterval(countdown);
							}
						}, 1000);
					} else if (msg[0] == NEW_QUESTION) {
						displayGame();
						onNewQuestion();
					}

					break;
				}

				case WAIT_QUESTION: {
					if (msg[0] == NEW_QUESTION) {
						onNewQuestion();
					} else if(msg[0] == END_GAME) {
						displayEnd(msg);
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

						state = WAIT_QUESTION;
					}

					break;
				}
			}
		}
	}
}

function displayEnd(msg) {
	document.body.innerHTML = `
	<div id="endContent">
		<h1>Partie terminée</h1>	
		<h1>Votre score : ${msg[1]}</h1>
		<div>
			<a href='./play' class="button">Cliquez ici pour relancer une partie</a>
		</div>
	</div>`;

}

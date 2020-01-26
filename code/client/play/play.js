"use strict";

const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0,
	SET_PSEUDO = 1,
	DEL_PLAYER = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME_COUNTDOWN = 4,
	START_GAME = 5;

const NEW_QUESTION = 0,
	ANSWERS_STATS = 1,
	END_QUESTION = 2,
	END_GAME = 3;

const WAIT_NOTHING = 0,
	WAIT_GAME_INFO = 1,
	WAIT_WAITING_ROOM_EVENT = 2,
	WAIT_QUESTION = 3,
	WAIT_QUESTION_EVENT = 4;

window.onload = function () {
	document.body.innerHTML = `
	<div id="players-info">Nombre de joueurs connectés : <span id="players-count">...</span></div>
	<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>

	<div id="player-pseudo-info">Votre pseudo est <span id="player-pseudo">...</span></div>
	<input id="pseudo-input" type="text" placeholder="Entrez votre pseudo" required autofocus>
	<div id="pseudo-error"></div>
	<div id="send-pseudo-button">Envoyer</div>

	<div id="players-list-header">Joueurs connectés</div>
	<div id="players-list">

	</div>
	`;

	let pseudoInput = document.getElementById("pseudo-input");
	pseudoInput.onfocus = function () {
		let pseudoError = document.getElementById("pseudo-error");
		pseudoError.innerHTML = "";
	}

	let sendPseudoButton = document.getElementById("send-pseudo-button");
	sendPseudoButton.onclick = function () {

		//REPERE 1
		sock.send(JSON.stringify([pseudoInput.value]));

		let pseudoError = document.getElementById("pseudo-error");
		pseudoError.innerHTML = "";
	};

	let sock = new WebSocket("ws://" + window.location.host);

	sock.onopen = function () {
		let state = WAIT_GAME_INFO;
		let players; // tableau des pseudos de joueurs

		let meId; // mon identifiant de joueur

		let actualQuestion = 0;
		let questionCountdown;

		let chosenAnswer;

		//REPERE 2
		sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));


		function displayGame() {
			document.body.innerHTML = `
			<div id="question-number">Question 1</div>
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

			switch (state) {
				case WAIT_GAME_INFO: {
					let minPlayersCount = document.getElementById("min-players-count");
					minPlayersCount.innerHTML = msg[0];

					let playersCount = msg[1];

					let playersCountSpan = document.getElementById("players-count");
					playersCountSpan.innerHTML = playersCount;

					meId = msg[2 + playersCount * 2];

					let playersList = document.getElementById("players-list");
					let playerPseudo = document.getElementById("player-pseudo")

					players = [];

					for (let i = 0; i < playersCount; i++) {
						players[i] = {};
						players[i].id = msg[2 + i * 2];
						players[i].pseudo = msg[3 + i * 2];

						players[i].line = document.createElement("div");
						players[i].line.classList.add("players-list-player");
						players[i].line.innerHTML = players[i].pseudo;

						playersList.appendChild(players[i].line);

						if (players[i].id == meId) {
							playerPseudo.innerHTML = players[i].pseudo;
						}
					}

					state = WAIT_WAITING_ROOM_EVENT;
					break;
				}

				case WAIT_WAITING_ROOM_EVENT: {
					if (msg[0] == ADD_PLAYER) {
						let player = {
							id: msg[1],
							pseudo: msg[2]
						};

						players.push(player);

						player.line = document.createElement("div");
						player.line.classList.add("players-list-player");
						player.line.innerHTML = player.pseudo;

						let playersList = document.getElementById("players-list");
						playersList.appendChild(player.line);

						let playersCount = document.getElementById("players-count")
						playersCount.innerHTML = players.length;
					} else if (msg[0] == SET_PSEUDO) {
						for (let player of players) { // on récupère le joueur concerné grâce à son id
							if (player.id == msg[1]) {
								player.pseudo = msg[2]; // on change le pseudo du joueur
								player.line.innerHTML = player.pseudo; // on met à jour la liste des joueurs HTML

								if (player.id == meId) {
									let playerPseudo = document.getElementById("player-pseudo");
									playerPseudo.innerHTML = player.pseudo;
								}

								break;
							}
						}
					} else if (msg[0] == DEL_PLAYER) {
						for (let player of players) {
							if (player.id == msg[1]) {
								player.line.remove();
								players.splice(players.indexOf(player), 1);

								let playersCount = document.getElementById("players-count");
								playersCount.innerHTML = players.length;
							}
						}
					} else if (msg[0] == PSEUDO_ALREADY_USED) {
						let pseudoError = document.getElementById("pseudo-error");
						pseudoError.innerHTML = "Ce pseudo est déjà utilisé";
					} else if (msg[0] == START_GAME_COUNTDOWN) {
						let countdownInfo = document.createElement("div");
						countdownInfo.id = "start-countdown-info";

						let textNode = document.createTextNode("La partie commence dans ");
						countdownInfo.appendChild(textNode);

						let time = msg[1];

						let countdownSpan = document.createElement("span");
						countdownSpan.id = "start-countdown";
						countdownSpan.innerHTML = time;

						countdownInfo.appendChild(countdownSpan);

						let playerPseudoInfo = document.getElementById("player-pseudo-info");
						document.body.insertBefore(countdownInfo, playerPseudoInfo)

						let countdown = setInterval(function () {
							time--;
							countdownSpan.innerHTML = time;

							if (time == 0) {
								clearInterval(countdown);
							}
						}, 1000);
					} else if (msg[0] == START_GAME) {
						displayGame();
						state = WAIT_QUESTION;
					}

					break;
				}

				case WAIT_QUESTION: {
					if (msg[0] == NEW_QUESTION) {
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

						actualQuestion++;

						let questionNumber = document.getElementById("question-number");
						questionNumber.innerHTML = "Question " + actualQuestion;

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
						break;
					}
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
					} else if (msg[0] == END_GAME) {
						displayEnd(msg);
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

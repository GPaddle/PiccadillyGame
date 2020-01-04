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

const STATE_NONE = 0,
	STATE_GAME_INFO = 1,
	STATE_PLAYER_LIST = 2,
	STATE_WAITING_ROOM = 3,
	STATE_WAIT_QUESTION = 4,
	STATE_ANSWER = 5;

window.onload = function() {
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
	pseudoInput.onfocus = function() {
		pseudoError.innerHTML = "";
	}

	let sendPseudoButton = document.getElementById("send-pseudo-button");
	sendPseudoButton.onclick = function() {
		sock.send(JSON.stringify([pseudoInput.value]));
		pseudoError.innerHTML = "";
	};

	let sock = new WebSocket("ws://" + window.location.host);

	sock.onopen = function() {
		let state = STATE_GAME_INFO;
		let players; // tableau des pseudos de joueurs

		let meId; // mon identifiant de joueur

		let actualQuestion = 0;
		let questionCountdown;

		let chosenAnswer;

		sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

		function displayGame() {
			document.body.innerHTML = `
			<div id="question-number">Question 1</div>
			<div id="question-info"></div>
			<div class="answer-button">
				<div class="answer-letter">A</div>
				<div class="answer-stat">0%</div>
			</div>
			<div class="answer-button">
				<div class="answer-letter">B</div>
				<div class="answer-stat">0%</div>
			</div>
			<div class="answer-button">
				<div class="answer-letter">C</div>
				<div class="answer-stat">0%</div>
			</div>
			<div class="answer-button">
				<div class="answer-letter">D</div>
				<div class="answer-stat">0%</div>
			</div>
			`;

			let answersButtons = document.getElementsByClassName("answer-button");

			for(let i = 0; i < 4; i++) {
				answersButtons[i].onclick = function() {
					if(chosenAnswer === undefined && state == STATE_ANSWER) {
						chosenAnswer = i;
						answersButtons[chosenAnswer].style.border = "solid 2px #fefefe";

						sock.send(JSON.stringify([chosenAnswer])); // on envoit le numéro de la réponse sélectionnée
					}
				}
			}
		}

		sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch (state) {
				case STATE_GAME_INFO: {
					let minPlayersCount = document.getElementById("min-players-count");
					minPlayersCount.innerHTML = msg[0];

					players = msg[1];

					let playersCount = document.getElementById("players-count");
					playersCount.innerHTML = players.length;

					meId = msg[2];

					let playersList = document.getElementById("players-list");
					let playerPseudo = document.getElementById("player-pseudo")

					for(let player of players) {
						player.line = document.createElement("div");
						player.line.classList.add("players-list-player");
						player.line.innerHTML = player.pseudo;

						playersList.appendChild(player.line);

						if(player.id == meId) {
							playerPseudo.innerHTML = player.pseudo;
						}
					}

					state = STATE_WAITING_ROOM;
					break;
				}

				case STATE_WAITING_ROOM: {
					if(msg[0] == ADD_PLAYER) {
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
					} else if(msg[0] == SET_PSEUDO) {
						for(let player of players) { // on récupère le joueur concerné grâce à son id
							if(player.id == msg[1]) {
								player.pseudo = msg[2]; // on change le pseudo du joueur
								player.line.innerHTML = player.pseudo; // on met à jour la liste des joueurs HTML

								if(player.id == meId) {
									let playerPseudo = document.getElementById("player-pseudo");
									playerPseudo.innerHTML = player.pseudo;
								}

								break;
							}
						}
					} else if(msg[0] == DEL_PLAYER) {
						for(let player of players) {
							if(player.id == msg[1]) {
								player.line.remove();
								players.splice(players.indexOf(player), 1);

								let playersCount = document.getElementById("players-count");
								playersCount.innerHTML = players.length;
							}
						}
					} else if(msg[0] == PSEUDO_ALREADY_USED) {
						let pseudoError = document.getElementById("pseudo-error");
						pseudoError.innerHTML = "Ce pseudo est déjà utilisé";
					} else if(msg[0] == START_GAME_COUNTDOWN) {
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

						let countdown = setInterval(function() {
							time--;
							countdownSpan.innerHTML = time;

							if(time == 0) {
								clearInterval(countdown);
							}
						}, 1000);
					} else if(msg[0] == START_GAME) {
						displayGame();
						state = STATE_WAIT_QUESTION;
					}

					break;
				}

				case STATE_WAIT_QUESTION: {
					if(msg[0] == NEW_QUESTION) {
						if(chosenAnswer !== undefined) {
							let clickedAnswerButton = document.getElementsByClassName("answer-button")[chosenAnswer];
							clickedAnswerButton.style.border = "";
						}

						chosenAnswer = undefined;

						let answersStats = document.getElementsByClassName("answer-stat");

						for(let answerStat of answersStats) {
							answerStat.innerHTML = "";
						}

						actualQuestion++;

						let questionNumber = document.getElementById("question-number");
						questionNumber.innerHTML = "Question " + actualQuestion;

						let answersButtons = document.getElementsByClassName("answer-button");

						for(let answerButton of answersButtons) {
							answerButton.style.backgroundColor = "";
						}

						clearInterval(questionCountdown);

						let time = msg[1];

						let questionInfo = document.getElementById("question-info");
						questionInfo.innerHTML = "Temps restant : <span id=\"question-countdown\"></span>"

						let questionCountdownSpan = document.getElementById("question-countdown");
						questionCountdownSpan.innerHTML = time;

						questionCountdown = setInterval(function() {
							time--;
							questionCountdownSpan.innerHTML = time;

							if(time == 0) {
								clearTimeout(questionCountdown);
							}
						}, 1000);

						state = STATE_ANSWER;
						break;
					}
				}

				case STATE_ANSWER: {
					if(msg[0] == ANSWERS_STATS) {
						let answersStats = document.getElementsByClassName("answer-stat");

						for(let i = 0; i < answersStats.length; i++) {
							answersStats[i].innerHTML = msg[1][i] + "%";
						}
					} else if(msg[0] == END_QUESTION) {
						let answersButtons = document.getElementsByClassName("answer-button");

						for(let answerButton of answersButtons) {
							answerButton.backgroundColor = "#a65050";
						}

						answersButtons[msg[1]].style.backgroundColor = "#22780F";

						let questionInfo = document.getElementById("question-info");

						if(chosenAnswer == msg[1]) {
							questionInfo.innerHTML = "Bonne réponse !";
						} else {
							questionInfo.innerHTML = "Mauvaise réponse...";
						}

						state = STATE_WAIT_QUESTION;
					} else if(msg[0] == END_GAME) {
						let questionInfo = document.getElementById("question-info");
						questionInfo.innerHTML = "Fin de la partie";
					}

					break;
				}
			}
		}
	}
}
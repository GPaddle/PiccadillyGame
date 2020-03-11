"use strict";

import initGame from "./play/game.js"

const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	PSEUDO_OK = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME = 5;

const END_GAME = 0;

const WAIT_GAME_INFO = 0,
	WAIT_WAITING_ROOM_EVENT = 1;

window.onload = function () {
	const game = {} // l'objet game contient les variables et fonctions partagées entre ce fichier et le fichier de jeu (questions.js ou space.js)

	game.sock = new WebSocket("ws://" + window.location.host);

	let pseudoError = false;
	let players; // tableau des pseudos de joueurs
	let testMode;

	initGame(game);

	function displayWaitingRoom() {
		document.body.innerHTML = `
		<div id="player-pseudo-info">Votre pseudo :</div>
		<input id="pseudo-input" type="text" placeholder="Entrez votre pseudo" required autofocus>
		<div id="game-info"></div>
		<div id="join-button">Rejoindre la partie</div>

		<div id="players-list-header">Joueurs connectés</div>
		<div id="players-list">

		</div>
		`;

		let pseudoInput = document.getElementById("pseudo-input");
		pseudoInput.onfocus = function () {
			if(pseudoError) {
				let gameInfo = document.getElementById("game-info");
				gameInfo.innerHTML = "";
				pseudoError = false;
			}
		}

		document.getElementById("join-button").addEventListener("click", function () {
			//REPERE 1
			game.sock.send(JSON.stringify([pseudoInput.value]));
		});

		game.state = WAIT_GAME_INFO;
	}

	function addPlayer(id, pseudo) {
		let player = {id: id, pseudo: pseudo};

		player.line = document.createElement("div");
		player.line.classList.add("players-list-player");
		player.line.innerHTML = player.pseudo;

		let playersList = document.getElementById("players-list");
		playersList.appendChild(player.line);

		players.push(player);
	}

	game.sock.onopen = function () {
		displayWaitingRoom();

		//REPERE 2
		game.sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

		if(testMode) {
			document.getElementById("join-button").click();
		}

		game.sock.onmessage = function (json) {
			let msg = JSON.parse(json.data);

			switch(game.state) {
				case WAIT_GAME_INFO: {
					let pseudoInput = document.getElementById("pseudo-input");
					pseudoInput.value = msg[0];

					let playersCount = msg[1];

					testMode = msg[2];

					players = [];
					let playersList = document.getElementById("players-list");

					for (let i = 0; i < playersCount; i++) {
						players[i] = {};
						players[i].id = msg[3 + i * 2];
						players[i].pseudo = msg[4 + i * 2];

						players[i].line = document.createElement("div");
						players[i].line.classList.add("players-list-player");
						players[i].line.innerHTML = players[i].pseudo;

						playersList.appendChild(players[i].line);
					}

					game.state = WAIT_WAITING_ROOM_EVENT;
					break;
				}

				case WAIT_WAITING_ROOM_EVENT: {
					if (msg[0] == ADD_PLAYER) {
						addPlayer(msg[1], msg[2]);
					} else if (msg[0] == DEL_PLAYER) {
						for (let player of players) {
							if (player.id == msg[1]) {
								player.line.remove();
								players.splice(players.indexOf(player), 1);
							}
						}
					} else if(msg[0] == PSEUDO_OK) {
						let pseudoInput = document.getElementById("pseudo-input");
						addPlayer(msg[1], pseudoInput.value);

						let joinButton = document.getElementById("join-button");
						let gameInfo = document.getElementById("game-info");

						document.body.removeChild(joinButton);
						gameInfo.innerHTML = "Pseudo validé";
						pseudoInput.readOnly = true;
					} else if (msg[0] == PSEUDO_ALREADY_USED) {
						let gameInfo = document.getElementById("game-info");
						gameInfo.innerHTML = "Ce pseudo est déjà utilisé";
						pseudoError = true;
					} else if(msg[0] == START_GAME) {
						game.onStart(msg);
					}

					break;
				}

				default: {
					if(msg[0] == END_GAME) {
						document.body.innerHTML = `
						<div id="endContent">
							<h1>Partie terminée</h1>	
							<h1>Votre score : ${msg[1]}</h1>
							<div>
								<div id="replay-button" class="button">Rejouer</a>
							</div>
						</div>`;

						let replayButton = document.querySelector("#replay-button");

						replayButton.addEventListener("click", function() {
							game.sock.send("[0, 0, 0]"); // ici, on doit juste envoyer un paquet pour indiquer au serveur qu'on souhaite rejouer. le contenu du paquet est ignoré donc "0" ne signifie rien
							displayWaitingRoom();
						});
					} else {
						game.onMessage(msg); // on passe la main au code du jeu
					}

					break;
				}
			}
		}
	}
}
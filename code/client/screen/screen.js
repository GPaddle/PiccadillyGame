"use strict";

const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	START_GAME_COUNTDOWN = 4,
	END_GAME = 5;

const WAIT_GAME_INFO = 0,
	WAIT_WAITING_ROOM_EVENT = 1;

window.onload = function() {
	const game = {}; // l'objet game contient les variables et fonctions partagées entre ce fichier et le fichier de jeu (questions.js ou space.js)

	game.sock = new WebSocket("ws://" + window.location.host);
	game.state = WAIT_GAME_INFO;

	initGame(game);

	game.endGame = function(msg) {
		document.body.innerHTML = `<div id="results-header">Résultats</div><div id="results"></div>`;

		let resultsDiv = document.getElementById("results");

		for(let i = 0; i < msg[1]; i++) {
			resultsDiv.innerHTML += `
			<div class="result">
				<div class="result-pseudo">${msg[2 + i * 2]}</div>
				<div class="result-score">${msg[3 + i * 2]}</div>
			</div>`;

			console.log(msg[2+i]);
		}

		game.state = WAIT_GAME_INFO;
	}

	game.sock.onopen = function() {
		//REPERE 1
		game.sock.send(JSON.stringify([CLIENT_TYPE_SCREEN]));

		game.sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch (game.state) {
				case WAIT_GAME_INFO: {
					document.body.innerHTML = `
					<div id="service-name">Piccadilly Game</div>
					<div id="join-invitation">Rejoignez la partie sur <a href='http://${window.location.host}/play' id='url' target='_blank'>http://${window.location.host}/play</a></div>
					<canvas id="qr"></canvas>
					<div id="players-info">Nombre de joueurs connectés : <span id="players-count">0</span></div>
					<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>
					`;

					let qr = new QRious({
						element : document.getElementById("qr"),
						value : `http://${window.location.host}/play`,
						background : "transparent",
						foreground : "#fff",
						level: 'H',
						size : 300,
						padding : null
					});

					let minPlayersCount = document.getElementById("min-players-count");
					minPlayersCount.innerHTML = msg[0];

					let playersCountSpan = document.getElementById("players-count");
					playersCountSpan.innerHTML = msg[1];

					game.players = []; // TEMPORAIRE !! NE PAS OUBLIER DE RETIRER !

					game.state = WAIT_WAITING_ROOM_EVENT;
					break;
				}

				case WAIT_WAITING_ROOM_EVENT: {
					if(msg[0] == ADD_PLAYER) {
						game.players.push({id: msg[1]});

						let playersCountSpan = document.getElementById("players-count");
						playersCountSpan.innerHTML = game.players.length;
					} else if(msg[0] == DEL_PLAYER) {
						for(let i = 0; i < game.players.length; i++) {
							if(msg[1] == game.players[i].id) {
								game.players.splice(i, 1);
								break;
							}
						}

						let playersCountSpan = document.getElementById("players-count");
						playersCountSpan.innerHTML = game.players.length;
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
					} else {
						game.onWaitingRoomMessage(msg);
					}

					break;
				}

				default: {
					game.onMessage(msg);
					break;
				}
			}
		}
	}
}
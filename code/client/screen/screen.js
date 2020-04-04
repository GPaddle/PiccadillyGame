"use strict";

import initGame from "./screen/game.js";

const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	START_GAME_COUNTDOWN = 4,
	START_GAME = 5,
	NEW_SCREEN = 6;

const STOP_GAME = 0;

const WAIT_GAME_INFO = 0,
	WAIT_WAITING_ROOM_EVENT = 1;

window.onload = function () {
	const game = {}; // l'objet game contient les variables et fonctions partagées entre ce fichier et le fichier de jeu (questions.js ou space.js)

	game.sock = new WebSocket("ws://" + window.location.host); // on se connecte au serveur websocket
	game.state = WAIT_GAME_INFO; // on se met en mode "attente des infos de la partie"

	initGame(game); // on initialise l'objet game avec les fonctions propres au jeu

	let playersCount; // nombre de joueurs

	game.sock.onopen = function () { // quand on s'est connecté au serveur
		//REPERE 1
		game.sock.send(JSON.stringify([CLIENT_TYPE_SCREEN])); // on dit au serveur qu'on est un écran (et pas un joueur)

		game.sock.onmessage = function (json) { // quand on reçoit un message du serveur
			let msg = JSON.parse(json.data); // on interprète le message JSON

			switch (game.state) {
				case WAIT_GAME_INFO: { // quand on reçoit les infos de la partie
					document.body.innerHTML = `
					<div id="home">
						<div id="service-name">Piccadilly Game</div>
						<div id="join-invitation">Rejoignez la partie sur <a href='http://${window.location.host}/play' id='url' target='_blank'>http://${window.location.host}/play</a></div>
						<canvas id="qr"></canvas>
						<div id="players-info">Nombre de joueurs connectés : <span id="players-count">0</span></div>
						<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>
					</div>`; // on affiche l'écran d'attente

					let qr = new QRious({
						element: document.getElementById("qr"),
						value: `http://${window.location.host}/play`,
						background: "transparent",
						foreground: "#fff",
						level: 'H',
						size: 300,
						padding: null
					}); // on affiche le qr code

					let minPlayersCount = document.getElementById("min-players-count");
					minPlayersCount.innerHTML = msg[0]; // on affiche le nombre de joueurs minimal

					playersCount = msg[1]; // on récupère le nombre de joueurs déjà connectés

					let playersCountSpan = document.getElementById("players-count");
					playersCountSpan.innerHTML = playersCount; // on affiche le nombre de joueurs connectés

					game.state = WAIT_WAITING_ROOM_EVENT; // on passe à l'état "attente d'évènement de salle d'attente"
					break;
				}

				case WAIT_WAITING_ROOM_EVENT: { // quand on reçoit un évènement de salle d'attente
					if (msg[0] == ADD_PLAYER) { // quand un joueur a rejoint la salle d'attente
						playersCount++;
						document.getElementById("players-count").innerHTML = playersCount; // on affiche le nouveau nombre de joueurs
					} else if (msg[0] == DEL_PLAYER) { // quand un joueur quitte la salle d'attente
						playersCount--;
						document.getElementById("players-count").innerHTML = playersCount; // on affiche le nouveau nombre de joueurs
					} else if (msg[0] == START_GAME_COUNTDOWN) { // quand le compte à rebours a commencé
						let countdownInfo = document.createElement("div");
						countdownInfo.id = "start-countdown-info";

						//msg[2] correspond au nom du jeu 
						let icone;
						switch (msg[2]) {
							case "questions":
								icone = "🖋️";
								break;

							case "space":
								icone = "🚀";
								break;

							default:
								break;
						}

						countdownInfo.innerHTML = "<div> Le jeu sera : "+msg[2]+" "+icone + "</div><div>La partie commence dans ";

						let time = msg[1]; // on récupère le temps de compte à rebours

						let countdownSpan = document.createElement("span");
						countdownSpan.innerHTML = time+"</div>";

						countdownInfo.appendChild(countdownSpan); // on ajoute la balise de compte à rebours

						let playersInfo = document.getElementById("players-info");
						let home = document.querySelector("#home");
						home.insertBefore(countdownInfo, playersInfo);

						let countdown = setInterval(function () {
							time--;
							countdownSpan.innerHTML = time; // on actualise le compte à rebours affiché

							if (time == 0) {
								clearInterval(countdown); // quand le compte à rebours est arrivé à 0, on l'arrête
							}
						}, 1000)
					} else if (msg[0] == START_GAME) { // quand la partie commence
						game.onStart(msg); // on passe la main au jeu
					} else if (msg[0] == NEW_SCREEN) { // Si il s'agit d'un nouvel écran
						game.onMessage(msg); // On utilise la fonction onMessage combinée au message de nouvel écran
					}

					break;
				}

				default: { // quand on est dans l'état "partie en cours"
					if (msg[0] == STOP_GAME) { // si on reçoit un message "fin de partie"
						document.body.innerHTML = `<div id="results-header">Résultats</div><div id="results"></div>`; // on affiche l'en-tête des scores

						let resultsDiv = document.getElementById("results");

						for (let i = 0; i < msg[1]; i++) {
							resultsDiv.innerHTML += `
							<div class="result">
								<div class="result-pseudo">${msg[2 + i * 2]}</div>
								<div class="result-score">${msg[3 + i * 2]}</div>
							</div>`; // on affiche le score de chaque joueur
						}

						game.state = WAIT_GAME_INFO; // on recommence à l'état "attente des infos de la prochaine partie"
					} else {
						game.onMessage(msg); // sinon on passe le message au jeu
					}

					break;
				}
			}
		}
	}

	game.sock.onclose = function () {
		document.body.innerHTML = `<div id="disconnect-message">Le serveur a été déconnecté. La page doit être rechargée.</div>`; // on affiche un message quand le serveur est déconnecté
	}
}
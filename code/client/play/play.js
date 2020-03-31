"use strict";

import initGame from "./play/game.js"

const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	PSEUDO_OK = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME = 5;

const STOP_GAME = 0;

const WAIT_GAME_INFO = 0,
	WAIT_WAITING_ROOM_EVENT = 1;

window.onload = function () {
	const game = {} // l'objet game contient les variables et fonctions partagées entre ce fichier et le fichier de jeu (questions.js ou space.js)

	game.sock = new WebSocket("ws://" + window.location.host); // on se connecte au serveur websocket

	let pseudoError = false;
	let players; // tableau des pseudos de joueurs

	initGame(game); // on initialise l'objet game avec les fonctions propres au jeu

	function displayWaitingRoom() { // affiche la salle d'attente
		document.body.innerHTML = `
		<div id="player-pseudo-info">Votre pseudo :</div>
		<input id="pseudo-input" type="text" placeholder="Entrez votre pseudo" required autofocus>
		<div id="game-info"></div>
		<div id="join-button">Rejoindre la partie</div>

		<div id="players-list-header">Joueurs connectés</div>
		<div id="players-list">

		</div>
		`; // on affiche la salle d'attente

		let pseudoInput = document.getElementById("pseudo-input");
		pseudoInput.onfocus = function () {
			if (pseudoError) {
				let gameInfo = document.getElementById("game-info");
				gameInfo.innerHTML = ""; // on efface le message d'erreur quand on reclique sur le champs de saisie du pseudo
				pseudoError = false;
			}
		}

		document.getElementById("join-button").addEventListener("click", function () {
			//REPERE 1
			game.sock.send(JSON.stringify([pseudoInput.value])); // quand on clique sur "Rejoindre la partie", on envoie le pseudo au serveur
		});

		game.state = WAIT_GAME_INFO; // on passe en mode "attente des infos de la partie"
	}

	function addPlayer(id, pseudo) { // ajoute un joueur à la liste de joueurs de la salle d'attente
		let player = { id: id, pseudo: pseudo };

		player.line = document.createElement("div");
		player.line.classList.add("players-list-player");
		player.line.innerHTML = player.pseudo;

		let playersList = document.getElementById("players-list");
		playersList.appendChild(player.line); // on ajoute le joueur à la liste de joueurs de l'interface de la salle d'attente

		players.push(player); // on ajoute le joueur à la liste des joueurs
	}

	game.sock.onopen = function () { // quand on se connecte au serveur
		displayWaitingRoom();

		//REPERE 2
		game.sock.send(JSON.stringify([CLIENT_TYPE_PLAYER])); // on dit au serveur "je suis un joueur"

		game.sock.onmessage = function (json) { // quand on reçoit un message du serveur
			let msg = JSON.parse(json.data); // on interprète le message JSON

			switch (game.state) {
				case WAIT_GAME_INFO: { // quand on reçoit les infos sur la partie avant le lancement
					let pseudoInput = document.getElementById("pseudo-input");
					pseudoInput.value = msg[0]; // on préremplit le champs de saisie du pseudo avec la proposition de pseudo du serveur

					let playersCount = msg[1]; // on enregistre le nombre de joueurs

					if (msg[2]) { // si le mode de test est activé
						document.getElementById("join-button").click();
					}

					players = []; // on crée une liste de joueurs vide
					let playersList = document.getElementById("players-list");

					for (let i = 0; i < playersCount; i++) {
						players[i] = {};
						players[i].id = msg[3 + i * 2];
						players[i].pseudo = msg[4 + i * 2];

						players[i].line = document.createElement("div");
						players[i].line.classList.add("players-list-player");
						players[i].line.innerHTML = players[i].pseudo;

						playersList.appendChild(players[i].line); // on remplit la liste de joueurs html avec les données du serveur
					}

					game.state = WAIT_WAITING_ROOM_EVENT; // on passe en mode "attente d'évènement de salle d'attente"
					break;
				}

				case WAIT_WAITING_ROOM_EVENT: { // quand on attend des évènements de salle d'attente
					if (msg[0] == ADD_PLAYER) { // quand un joueur a rejoint la partie
						addPlayer(msg[1], msg[2]); // on ajoute ce joueur à la liste de joueurs
					} else if (msg[0] == DEL_PLAYER) { // quand un joueur a quitté la plateforme
						for (let player of players) {
							if (player.id == msg[1]) {
								player.line.remove(); // on retire ce joueur de la liste
								players.splice(players.indexOf(player), 1);
							}
						}
					} else if (msg[0] == PSEUDO_OK) { // quand le pseudo du joueur a été validé par le serveur
						game.meId = msg[1] // l'id du joueur (de moi)

						let pseudoInput = document.getElementById("pseudo-input");
						addPlayer(game.meId, pseudoInput.value); // on s'ajoute soi même à la liste de joueurs

						let joinButton = document.getElementById("join-button");
						let gameInfo = document.getElementById("game-info");

						document.body.removeChild(joinButton); // on retire le bouton pour rejoindre la partie
						gameInfo.innerHTML = "Pseudo validé"; // on affiche que le pseudo a été validé
						pseudoInput.readOnly = true; // on empêche la modification du champs de saisie du pseudo
					} else if (msg[0] == PSEUDO_ALREADY_USED) { // quand le pseudo a été refusé par le serveur (déjà utilisé)
						let gameInfo = document.getElementById("game-info");
						gameInfo.innerHTML = "Ce pseudo est déjà utilisé"; // on affiche un message d'erreur
						pseudoError = true;
					} else if (msg[0] == START_GAME) { // quand la partie commence
						game.onStart(msg); // on passe la main au fichier propre au jeu
					}

					break;
				}

				default: {
					if (msg[0] == STOP_GAME) { // si on est en cours de partie et que la partie a été arrêtée
						document.body.innerHTML = `
						<div id="endContent">
							<h1>Partie terminée</h1>	
							<h1>Votre score : ${msg[1]}</h1>
							<div>
								<div id="replay-button" class="button">Rejouer</a>
							</div>
						</div>`; // on affiche l'interface de score avec un bouton "Rejouer"

						let replayButton = document.querySelector("#replay-button");

						replayButton.addEventListener("click", function () { // quand on clique sur "Rejouer"
							game.sock.send("[0, 0, 0]"); // ici, on doit juste envoyer un paquet pour indiquer au serveur qu'on souhaite rejouer. le contenu du paquet est ignoré donc "0" ne signifie rien
							displayWaitingRoom();

							let background = document.querySelector("body");
							background.style.background = "hsl(0deg, 47%,32.5%)";
						});
					} else {
						game.onMessage(msg); // on passe la main au code du jeu
					}

					break;
				}
			}
		}
	}

	game.sock.onclose = function() {
		document.body.innerHTML = `<div id="disconnect-message">Le serveur a été déconnecté. Essayez de recharger la page.</div>`; // on affiche un message quand le serveur s'est déconnecté
	}
}
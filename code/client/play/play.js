const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;

const STATE_NONE = 0;
const STATE_GAME_INFO = 1;
const STATE_PLAYER_LIST = 2;
const STATE_WAITING_ROOM = 3;

function displayHome() {
	document.body.innerHTML = `
	<div id="player-infos">
		<div class="player-info">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">...</span></div>
		<div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="min-players">...</span></div>
	</div>
	<div id="new-player-form">
		<input type="text" placeholder="Entrez votre pseudo" id="pseudo-input" required autofocus><br>
		<button id="send-pseudo-button">Envoyer</button>
	</div >
	<div id="player-list">

	</div>
	`;
}

window.onload = function() {
	displayHome();

	const sock = new WebSocket("ws://" + window.location.host);

	const connectedPlayersCount = document.getElementById("connected-players");
	const minPlayersCount = document.getElementById("min-players");

	const pseudoInput = document.getElementById("pseudo-input");
	const sendPseudoButton = document.getElementById("send-pseudo-button");

	const playersHtmlList = document.getElementById("player-list");

	let players;

	sock.onopen = function() {
		let state = STATE_GAME_INFO;

		sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

		sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch(state) {
				case STATE_GAME_INFO:
					players = msg[1];

					minPlayersCount.innerHTML = msg[0];
					connectedPlayersCount.innerHTML = players.length;

					for(player of players) {
						player.htmlLine = document.createElement("div");
						player.htmlLine.classList.add("player-list-player");
						player.htmlLine.innerHTML = player.pseudo;

						playersHtmlList.appendChild(player.htmlLine);
					}

					state = STATE_WAITING_ROOM;
					break;

				case STATE_WAITING_ROOM:
					if(msg[0] == ADD_PLAYER) {
						let player = {id: msg[1], pseudo: msg[2]};
						players.push(player);

						player.htmlLine = document.createElement("div");
						player.htmlLine.classList.add("player-list-player");
						player.htmlLine.innerHTML = player.pseudo;

						playersHtmlList.appendChild(player.htmlLine);

						connectedPlayersCount.innerHTML = players.length;
					} else if(msg[0] == SET_PSEUDO) {
						for(player of players) { // on récupère le joueur concerné grâce à son id
							if(player.id == msg[1]) {
								player.pseudo = msg[2]; // on change le pseudo du joueur
								player.htmlLine.innerHTML = player.pseudo; // on met à jour la liste des joueurs HTML
								break;
							}
						}
					} else if(msg[0] == DEL_PLAYER) {
						for(player of players) {
							if(player.id == msg[1]) {
								player.htmlLine.remove();
								players.splice(players.indexOf(player), 1);

								connectedPlayersCount.innerHTML = players.length;
							}
						}
					}

					break;
			}
		};

		sendPseudoButton.onclick = function() {
			sock.send(JSON.stringify([pseudoInput.value]));
		};
	};
}
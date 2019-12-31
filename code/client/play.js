const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const DEL_PLAYER = 1;

const STATE_NONE = 0;
const STATE_STATS = 1;
const STATE_WAITING_ROOM = 2;

function displayHome() {
	document.body.innerHTML = `
	<div id="player-infos">
		<div class="player-info">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">...</span></div>
		<div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="remaining-players">...</span></div>
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
	const remainingPlayersCount = document.getElementById("remaining-players");

	const pseudoInput = document.getElementById("pseudo-input");
	const sendPseudoButton = document.getElementById("send-pseudo-button");

	const playerList = document.getElementById("player-list");

	sock.onopen = function() {
		let state = STATE_STATS;

		sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

		sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch(state) {
				case STATE_STATS:
					connectedPlayersCount.innerHTML = msg[0];
					remainingPlayersCount.innerHTML = msg[1];

					let playersPseudos = msg[2];

					playersPseudos.forEach(function(pseudo) {
						let playerLine = document.createElement("div");
						playerLine.classList.add("player-list-player");
						playerLine.innerHTML = pseudo;

						playerList.appendChild(playerLine);
					})

					state = STATE_WAITING_ROOM;
					break;

				case STATE_WAITING_ROOM:
					if(msg[0] == ADD_PLAYER) {
						let playerLine = document.createElement("div");
						playerLine.classList.add("player-list-player");
						playerLine.innerHTML = msg[1];

						playerList.appendChild(playerLine);
					}

					break;
			}
		};

		sendPseudoButton.onclick = function() {
			sock.send(JSON.stringify([pseudoInput.value]));
		}
	};
}
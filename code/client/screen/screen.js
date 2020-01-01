const CLIENT_TYPE_SCREEN = 1;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const ADD_PLAYER = 0;
const DEL_PLAYER = 2;

const STATE_GAME_INFO = 0;
const STATE_WAITING_ROOM = 1;

function displayHome() {
	document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="join-invitation">Rejoignez la partie sur http://` + window.location.host + `/play</div>
	<div id="player-infos">
		<div class="player-info" id="player-info-first">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">0</span></div>
		<div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="min-players">...</span></div>
	</div>
	`;
}

window.onload = function() {
	displayHome();

	const connectedPlayersCountHtml = document.getElementById("connected-players");
	const minPlayersCountHtml = document.getElementById("min-players");

	const sock = new WebSocket("ws://" + window.location.host);

	sock.onopen = function() {
		let state = STATE_GAME_INFO;

		let playersNumber = 0;
		let minPlayersCount;

		sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

		sock.onmessage = function(json) {
			let msg = JSON.parse(json.data);

			switch(state) {
				case STATE_GAME_INFO:
					minPlayersCount = msg[0];
					minPlayersCountHtml.innerHTML = minPlayersCount;

					state = STATE_WAITING_ROOM;
					break;

				case STATE_WAITING_ROOM:
					if(msg[0] == ADD_PLAYER) {
						playersNumber++;
						connectedPlayersCountHtml.innerHTML = playersNumber;
					} else if(msg[0] == DEL_PLAYER) {
						playersNumber--;
						connectedPlayersCountHtml.innerHTML = playersNumber;
					}

					break;
			}
		}
	}
}
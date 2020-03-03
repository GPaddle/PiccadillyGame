"use strict";

const START_GAME = 6;

const WAIT_GAME_EVENT = 2;

const PLAYER_MOVE = 0;

function gameOnWaitingRoomMessage() {
	if(msg[0] == START_GAME) {
		state = WAIT_GAME_EVENT;

		document.body.innerHTML = `
		<div id="game" style="height: 200px;width: 100%;">
			<span id="joueurs">
				
			</span>
			<span id="gate"></span>
		</div>
		`;

		let joueurs = document.querySelector("#joueurs");

		for(let i = 0; i < players.length; i++) {
			let fusee = document.createElement("span");
			fusee.className = "joueur";

			joueurs.appendChild(fusee);

			players[i].fusee = fusee;
		}
	}
}

function gameOnMessage() {
	if(state == WAIT_GAME_EVENT) {
		if(msg[0] == PLAYER_MOVE) {
			for(let i = 0; i < players.length; i++) {
				if(players[i].id == msg[1]) {
					players[i].fusee.style.top = msg[2] + "px";
					break;
				}
			}
		}
	}
}
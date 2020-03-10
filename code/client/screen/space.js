"use strict";

const START_GAME = 6;

const WAIT_GAME_EVENT = 2;

const PLAYER_MOVE = 0,
	NEW_GATE = 1,
	DEAD = 2;

function newGate() {
	let top = document.querySelector("#top");
	top.style.top = "1px";
	top.style.height = (msg[1] - 8) + "px";

	let bottom = document.querySelector("#bottom");
	bottom.style.top = (8 + msg[2]) + "px";
	bottom.style.height = (200 - msg[2] - msg[1] - 1) + "px";

	let startTimeStamp = null;

	function animation(timestamp) {
		if(startTimeStamp === null) {
			startTimeStamp = timestamp;
		}

		top.style.left = (1000 - (timestamp - startTimeStamp) * 0.4) + "px";
		bottom.style.left = (1000 - (timestamp - startTimeStamp) * 0.4) + "px";

		requestAnimationFrame(animation);
	}

	requestAnimationFrame(animation);
}

function gameOnWaitingRoomMessage() {
	if(msg[0] == START_GAME) {
		state = WAIT_GAME_EVENT;

		document.body.innerHTML = `
		<div id="game" style="height: 200px;width: 100%;overflow: hidden;">
			<span id="joueurs">

			</span>
			<span id="gate">
				<div id="top"></div>
				<div id="bottom"></div>
			</span>
		</div>
		`;

		let joueurs = document.querySelector("#joueurs");

		for(let i = 0; i < players.length; i++) {
			let fusee = document.createElement("span");
			fusee.className = "joueur";

			joueurs.appendChild(fusee);

			players[i].fusee = fusee;
		}

		newGate();
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
		} else if(msg[0] == NEW_GATE) {
			newGate();
		} else if(msg[0] == DEAD) {
			for(let player of players) {
				if(msg[1] == player.id) {
					let joueurs = document.querySelector("#joueurs");
					player.fusee.classList.add("dead-player");
				}
			}
		}
	}
}
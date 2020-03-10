"use strict";

const START_GAME = 6;

const WAIT_GAME_EVENT = 2;

const PLAYER_MOVE = 0,
	NEW_GATE = 1,
	DEAD = 2;

const GAME_HEIGHT = 210;
const BASE_HEIGHT = 12;

function newGate() {
	let gatePos = msg[1];
	let gateHeight = msg[2];

	document.querySelector(".gate-laser#top").style.height = (gatePos - 2 * BASE_HEIGHT) + "px";
	document.querySelector(".gate-base.bottom#top").style.top = (gatePos - BASE_HEIGHT) + "px";
	document.querySelector(".gate-wall#bottom").style.top = (gatePos + gateHeight) + "px";
	document.querySelector(".gate-laser#bottom").style.height = (GAME_HEIGHT - gatePos - gateHeight - 2 * BASE_HEIGHT) + "px";
	document.querySelector(".gate-base.bottom#bottom").style.top = (GAME_HEIGHT - gatePos - gateHeight - BASE_HEIGHT) + "px";

	let startTimeStamp = null;

	function animation(timestamp) {
		if(startTimeStamp === null) {
			startTimeStamp = timestamp;
		}

		document.querySelector("#gate").style.left = (1000 - (timestamp - startTimeStamp) * 0.4) + "px";

		requestAnimationFrame(animation);
	}

	requestAnimationFrame(animation);
}

function gameOnWaitingRoomMessage() {
	if(msg[0] == START_GAME) {
		state = WAIT_GAME_EVENT;

		document.body.innerHTML = `
		<div id="game" style="height: 210px;width: 100%;overflow: hidden;">
			<div id="starships">

			</div>
			<div id="gate">
				<div class="gate-wall" id="top">
					<img class="gate-base top" id="top" src="/screen/laser_top.png">
					<div class="gate-laser" id="top"></div>
					<img class="gate-base bottom" id="top" src="/screen/laser_top.png">
				</div>
				<div class="gate-wall" id="bottom">
					<img class="gate-base top" id="bottom" src="/screen/laser_top.png">
					<div class="gate-laser" id="bottom"></div>
					<img class="gate-base bottom" id="bottom" src="/screen/laser_top.png">
				</div>
			</div>
		</div>
		`;

		let joueurs = document.querySelector("#starships");

		for(let i = 0; i < players.length; i++) {
			let fusee = document.createElement("img");
			fusee.className = "starship";
			fusee.src = "/screen/starship.png";

			fusee.style.left = (i * 30) + "px";
			fusee.style.top = "0px";

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
					let fusees = document.querySelector("#starships");
					fusees.removeChild(player.fusee);
				}
			}
		}
	}
}
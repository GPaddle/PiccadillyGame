"use strict";

const END_GAME = 5,
	START_GAME = 6;

const WAIT_GAME_EVENT = 2;

const PLAYER_MOVE = 0,
	NEW_GATE = 1,
	DEAD = 2,
	NEW_PLAYER = 3;

const GAME_HEIGHT = 210;
const BASE_HEIGHT = 12;

export default function(game) {
	let nextRange;

	let players;

	game.onWaitingRoomMessage = function(msg) {
		if(msg[0] == START_GAME) {
			nextRange = 0;

			game.state = WAIT_GAME_EVENT;

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

			document.querySelector("#gate").style.left = "-100px";

			let joueurs = document.querySelector("#starships");

			players = [];

			for(let i = 0; i < msg[1]; i++) {
				let player = {id: msg[2 + i]};

				player.range = nextRange;
				nextRange++;

				let fusee = document.createElement("img");
				fusee.className = "starship";
				fusee.src = "/screen/starship.png";

				fusee.style.left = (player.range * 30) + "px";
				fusee.style.top = "0px";

				joueurs.appendChild(fusee);

				player.fusee = fusee;

				players.push(player);
			}
		}
	}

	game.onMessage = function(msg) {
		if(game.state == WAIT_GAME_EVENT) {
			if(msg[0] == PLAYER_MOVE) {
				for(let i = 0; i < players.length; i++) {
					if(players[i].id == msg[1]) {
						players[i].fusee.style.top = msg[2] + "px";
						break;
					}
				}
			} else if(msg[0] == NEW_GATE) {
				let gatePos = msg[1];
				let gateHeight = msg[2];
				let speed = msg[3];

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

					document.querySelector("#gate").style.left = (1000 - (timestamp - startTimeStamp) / 1000 * speed) + "px";

					if(game.state == WAIT_GAME_EVENT) {
						requestAnimationFrame(animation);
					}
				}

				requestAnimationFrame(animation);
			} else if(msg[0] == DEAD) {
				for(let player of players) {
					if(msg[1] == player.id) {
						let fusees = document.querySelector("#starships");
						fusees.removeChild(player.fusee);
					}
				}
			} else if(msg[0] == NEW_PLAYER) {
				let player = {id: msg[1]};

				player.range = nextRange;
				nextRange++;

				let fusee = document.createElement("img");
				fusee.className = "starship";
				fusee.src = "/screen/starship.png";

				fusee.style.left = (player.range * 30) + "px";
				fusee.style.top = "0px";

				let joueurs = document.querySelector("#starships");
				joueurs.appendChild(fusee);

				player.fusee = fusee;

				players.push(player);
			} else if(msg[0] == END_GAME) {
				game.endGame(msg);
			}
		}
	}
}
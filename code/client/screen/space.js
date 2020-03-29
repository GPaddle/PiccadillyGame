"use strict";

const WAIT_GAME_EVENT = 2;

const PLAYER_MOVE = 1,
	NEW_GATE = 2,
	NEW_STARSHIP = 3,
	DEL_STARSHIP = 4;

const GAME_HEIGHT = 210;
const BASE_HEIGHT = 12;

const PLAYER_ZONE = 200;

export default function (game) {
	let players;

	game.onStart = function (msg) {
		game.state = WAIT_GAME_EVENT;

		document.body.innerHTML = `
		<div id="game" style="height: 210px;width: 100%;overflow: hidden;">
			<div id="starships">

			</div>
			<div id="gate">
				<div class="gate-wall" id="top">
					<img class="gate-base top" id="top" src="/screen/laser-top.png">
					<div class="gate-laser" id="top"></div>
					<img class="gate-base bottom" id="top" src="/screen/laser-top.png">
				</div>
				<div class="gate-wall" id="bottom">
					<img class="gate-base top" id="bottom" src="/screen/laser-top.png">
					<div class="gate-laser" id="bottom"></div>
					<img class="gate-base bottom" id="bottom" src="/screen/laser-top.png">
				</div>
			</div>
		</div>
		`;

		document.querySelector("#gate").style.left = "-100px";

		let joueurs = document.querySelector("#starships");

		players = [];
		let playersCount = msg[1]

		let starshipsGap = Math.min(50, PLAYER_ZONE / playersCount);

		for(let i = 0; i < playersCount; i++) {
			let player = { id: msg[2 + i] };

			let fusee = document.createElement("img");
			fusee.className = "starship";
			fusee.src = "/screen/starship.png";

			fusee.style.top = "0px";
			fusee.style.left = i * starshipsGap + "px";

			fusee.style.filter = "hue-rotate(" + player.id * 80 + "deg)";

			player.fusee = fusee;
			joueurs.appendChild(fusee);

			players.push(player);
		}
	}

	game.onMessage = function (msg) {
		if (game.state == WAIT_GAME_EVENT) {
			if (msg[0] == PLAYER_MOVE) {
				for (let i = 0; i < players.length; i++) {
					if (players[i].id == msg[1]) {
						players[i].fusee.style.top = msg[2] + "px";
						break;
					}
				}
			} else if (msg[0] == NEW_GATE) {
				let porte = document.querySelector("#gate");

				porte.remove();
				document.querySelector("#game").appendChild(porte);

				let wallPos = msg[1];
				let gatePos = msg[2];
				let gateHeight = msg[3];
				let speed = msg[4];

				porte.style.animation = "apparition " + (330 / speed) + "s";

				document.querySelector(".gate-laser#top").style.height = (gatePos - 2 * BASE_HEIGHT) + "px";
				document.querySelector(".gate-base.bottom#top").style.top = (gatePos - BASE_HEIGHT) + "px";
				document.querySelector(".gate-wall#bottom").style.top = (gatePos + gateHeight) + "px";
				document.querySelector(".gate-laser#bottom").style.height = (GAME_HEIGHT - gatePos - gateHeight - 2 * BASE_HEIGHT) + "px";
				document.querySelector(".gate-base.bottom#bottom").style.top = (GAME_HEIGHT - gatePos - gateHeight - BASE_HEIGHT) + "px";

				let startTimeStamp = null;

				function animation(timestamp) {
					if (startTimeStamp === null) {
						startTimeStamp = timestamp;
					}

					let gate = document.querySelector("#gate");
					gate.style.left = (wallPos - (timestamp - startTimeStamp) / 1000 * speed) + "px";

					if (game.state == WAIT_GAME_EVENT) {
						requestAnimationFrame(animation);
					}
				}

				requestAnimationFrame(animation);
			} else if (msg[0] == NEW_STARSHIP) {
				let player = {id: msg[1]};

				let fusee = document.createElement("img");
				fusee.className = "starship";
				fusee.src = "/screen/starship.png";

				fusee.style.top = "0px";

				fusee.style.filter = "hue-rotate(" + player.id * 80 + "deg)";

				player.fusee = fusee;

				let joueurs = document.querySelector("#starships");
				joueurs.appendChild(fusee);

				players.push(player);

				let starshipsGap = Math.min(50, PLAYER_ZONE / players.length);

				for(let i = 0; i < players.length; i++)
					players[i].fusee.style.left = i * starshipsGap + "px";
			} else if (msg[0] == DEL_STARSHIP) {
				for (let i = 0; i < players.length; i++) {
					console.log("searching" + i);

					if (msg[1] == players[i].id) {
						console.log("find");

						let fusees = document.querySelector("#starships");
						fusees.removeChild(players[i].fusee);
						players.splice(i, 1);

						let starshipsGap = Math.min(50, PLAYER_ZONE / players.length);

						for(let i = 0; i < players.length; i++)
							players[i].fusee.style.left = i * starshipsGap + "px";

						return;
					}
				}
			}
		}
	}
}
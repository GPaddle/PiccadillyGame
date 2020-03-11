"use strict";

const START_GAME = 6;

function initGame(game) {
	game.onWaitingRoomMessage = function(msg) {
		if(msg[0] == START_GAME) {
			document.body.innerHTML = `
			<input type="range" value="0" max="200" id="slider">
			`;

			let slider = document.querySelector("#slider");

			slider.addEventListener("input", function () {
				game.sock.send(JSON.stringify([slider.value]));
			});
		}
	}
}
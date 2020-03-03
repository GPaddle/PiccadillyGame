"use strict";

const START_GAME = 6;

function gameOnWaitingRoomMessage() {
	if(msg[0] == START_GAME) {
		document.body.innerHTML = `
		<input type="range" value="0" orient="vertical" max="200" id="slider">
		`;

		let slider = document.querySelector("#slider");

		slider.addEventListener("input", function() {
			sock.send(JSON.stringify([slider.value]));
		});
	}
}
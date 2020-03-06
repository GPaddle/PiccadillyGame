"use strict";

const START_GAME = 6;

function gameOnWaitingRoomMessage() {
	if(msg[0] == START_GAME) {
		document.body.innerHTML = `
		
	<div id="content">
	<input type="range" value="0" max="200" id="slider">
</div>
		`;

		let slider = document.querySelector("#slider");

		slider.addEventListener("input", function() {
			sock.send(JSON.stringify([slider.max - slider.value]));
		});
	}
}
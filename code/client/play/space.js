"use strict";

const IN_GAME = 2;

export default function(game) {
	game.onStart = function(msg) {
		document.body.innerHTML = `
		<input type="range" value="0" max="200" id="slider">
		`;

		let slider = document.querySelector("#slider");

		slider.addEventListener("input", function () {
			game.sock.send(JSON.stringify([slider.value]));
		});

		game.state = IN_GAME;
	}
}
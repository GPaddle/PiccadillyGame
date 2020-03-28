"use strict";

const IN_GAME = 2;

export default function(game) {
	game.onStart = function(msg) {
		document.body.innerHTML = `
		<div id="starship-pres">Votre fusée est de cette couleur :</div>
		<img id="starship" src="/play/starship.png">
		<input type="range" value="0" max="191" id="slider">
		`;

		let starship = document.querySelector("#starship");
		starship.style.filter = "hue-rotate(" + game.meId * 80 + "deg)";

		let slider = document.querySelector("#slider");

		slider.addEventListener("input", function () {
			game.sock.send(JSON.stringify([slider.value]));
		});

		game.state = IN_GAME;
	}
}
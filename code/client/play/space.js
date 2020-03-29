"use strict";

const IN_GAME = 2;

const DEAD = 1;

const HUE_ROTATE = 80;

export default function (game) {
	game.onStart = function (msg) {
		document.body.innerHTML = `
		<div id="starship-pres">Votre fusée est de cette couleur :</div>
		<img id="starship" src="/play/starship.png">
		<input type="range" value="0" max="191" id="slider">
		`;

		let background = document.querySelector("body");
		
		background.style.filter = "hue-rotate(" + game.meId * HUE_ROTATE + "deg)";		
		background.style.background = "hsl(" + game.meId * HUE_ROTATE + "deg, 47%,32.5%)";

		let slider = document.querySelector("#slider");

		slider.addEventListener("input", function () {
			game.sock.send(JSON.stringify([slider.value]));
		});

		game.state = IN_GAME;
	}

	game.onMessage = function (msg) {
		if (msg[0] == DEAD) {
			document.body.innerHTML = `
			<div id="dead-message">Vous êtes mort...<br>Attendez la fin de la partie pour connaître votre score !<br>Ça ne prendra pas longtemps...</div>
			`
		}
	}
}
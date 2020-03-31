"use strict";

const IN_GAME = 2;

const DEAD = 1;

const HUE_ROTATE = 80;

export default function (game) {
	game.onStart = function (msg) { // quand la partie se lance
		document.body.innerHTML = `
		<div id="starship-pres">Votre fusée est de cette couleur :</div>
		<img id="starship" src="/play/starship.png">
		<input type="range" value="0" max="500" id="slider">
		`; // on affiche l'interface de contrôle de la fusée

		let background = document.querySelector("body");

		background.style.filter = "hue-rotate(" + game.meId * HUE_ROTATE + "deg)"; // on met la couleur de la fusée en couleur de fond
		background.style.background = "hsl(" + game.meId * HUE_ROTATE + "deg, 47%,32.5%)";

		let slider = document.querySelector("#slider");

		slider.addEventListener("input", function () {
			game.sock.send(JSON.stringify([slider.value])); // quand on bouge le slider, on envoie le mouvement au serveur
		});

		game.state = IN_GAME; // on se met en état "en cours de jeu"
	}

	game.onMessage = function (msg) {
		if (msg[0] == DEAD) { // quand on reçoit le message "vous êtes mort"
			document.body.innerHTML = `
			<div id="dead-message">Vous êtes mort...<br>
				Attendez la fin de la partie pour connaître votre score !<br>
				Ça ne prendra pas longtemps...
			</div>
			` // on affiche "vous êtes mort" à l'utilisateur
		}
	}
}
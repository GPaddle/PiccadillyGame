"use strict";

const WAIT_GAME_EVENT = 2;

const PLAYER_MOVE = 1,
	NEW_GATE = 2,
	NEW_STARSHIP = 3,
	DEL_STARSHIP = 4,
	NEW_SCREEN = 6;

const GAME_HEIGHT = 210;
const BASE_HEIGHT = 12;

const PLAYER_ZONE = 200;

export default function (game) {
	let starships; // liste des fusées affichées

	game.onStart = function (msg) { // quand la partie commence

		setup(); // on cache la porte car on ne sait pas à quel endroit elle doit être pour le moment

		let starshipsSprites = document.querySelector("#starships");

		let starshipsCount = msg[1]; // on récupère le nombre de fusées à afficher

		let starshipsGap = Math.min(50, PLAYER_ZONE / starshipsCount); // on calcule l'écart entre chaque fusée

		for (let i = 0; i < starshipsCount; i++) { // pour chaque fusée (joueur)
			let starship = { playerId: msg[2 + i] }; // on crée l'objet fusée avec l'id du joueur

			let sprite = document.createElement("img");
			sprite.className = "starship";
			sprite.src = "/screen/starship.png"; // on crée le sprite de la fusée

			sprite.style.top = "0px";
			sprite.style.left = i * starshipsGap + "px"; // on la positionne au bon endroit

			sprite.style.filter = "hue-rotate(" + starship.playerId * 80 + "deg)"; // on lui met la bonne couleur pour que les joueurs puissent trouver leur fusée facilement

			starship.sprite = sprite;
			starshipsSprites.appendChild(sprite); // on insère le sprite dans le html

			starships.push(starship); // on ajoute l'objet fusée à la liste des fusées
		}
	}

	game.onMessage = function (msg) { // quand on reçoit un message du serveur
		if (game.state == WAIT_GAME_EVENT) { // quand on est à l'état "attente d'évènement de jeu"
			if (msg[0] == PLAYER_MOVE) { // quand la fusée d'un joueur a bougé
				for (let i = 0; i < starships.length; i++) {
					if (starships[i].playerId == msg[1]) {
						starships[i].sprite.style.top = msg[2] + "px"; // on repositionne la fusée du joueur
						break;
					}
				}
			} else if (msg[0] == NEW_GATE) { // quand une nouvelle porte a été créée
				let porte = document.querySelector("#gate");

				porte.remove();
				document.querySelector("#game").appendChild(porte); // on retire et remet la porte dans le html pour redémarrer l'animation d'apparition

				let wallPos = msg[1];
				let gatePos = msg[2];
				let gateHeight = msg[3];
				let speed = msg[4]; // on récupère des données du serveur

				porte.style.animation = "apparition " + (330 / speed) + "s"; // on adapte la vitesse de l'animation d'apparition à la vitesse de la porte

				document.querySelector(".gate-laser#top").style.height = (gatePos - 2 * BASE_HEIGHT) + "px"; // on redimensionne la porte
				document.querySelector(".gate-base.bottom#top").style.top = (gatePos - BASE_HEIGHT) + "px";
				document.querySelector(".gate-wall#bottom").style.top = (gatePos + gateHeight) + "px";
				document.querySelector(".gate-laser#bottom").style.height = (GAME_HEIGHT - gatePos - gateHeight - 2 * BASE_HEIGHT) + "px";
				document.querySelector(".gate-base.bottom#bottom").style.top = (GAME_HEIGHT - gatePos - gateHeight - BASE_HEIGHT) + "px";

				let startTimeStamp = null;

				function animation(timestamp) {
					if (startTimeStamp === null) {
						startTimeStamp = timestamp; // on enregistre la date de début de l'animation
					}

					let gate = document.querySelector("#gate");
					gate.style.left = (wallPos - (timestamp - startTimeStamp) / 1000 * speed) + "px"; // on anime le déplacement de la porte vers les joueurs à la bonne vitesse

					if (game.state == WAIT_GAME_EVENT) {
						requestAnimationFrame(animation); // si on est toujours en train de jouer, on continue l'animation
					}
				}

				requestAnimationFrame(animation); // on démarre l'animation de mouvement de la porte
			} else if (msg[0] == NEW_STARSHIP) { // quand une nouvelle fusée est ajoutée (nouveau joueur)
				createStarship(msg[1]);

			} else if (msg[0] == DEL_STARSHIP) { // quand une fusée est supprimée (morte ou déconnexion)
				for (let i = 0; i < starships.length; i++) {
					if (msg[1] == starships[i].playerId) {
						let starshipsSprites = document.querySelector("#starships");
						starshipsSprites.removeChild(starships[i].sprite); // on supprime la fusée de l'écran
						starships.splice(i, 1); // on supprime l'objet fusée de la liste des fusées

						let starshipsGap = Math.min(50, PLAYER_ZONE / starships.length); // on calcule le nouvel écart entre les fusées

						for (let i = 0; i < starships.length; i++)
							starships[i].sprite.style.left = i * starshipsGap + "px"; // on replace toutes les fusées sur l'axe x

						return;
					}
				}
			}

		} else {

			if (msg[0] == NEW_SCREEN) {

				setup();

				for (let index = 0; index < msg[1].length; index++) {
					const element = msg[1][index];
					element.alive ? createStarship(element.id) : "";
					starships[index].sprite.style.top = element.coord + "px";
				}
			}
		}
	}

	function setup() {
		game.state = WAIT_GAME_EVENT; // on met l'état à "attente d'évènement de jeu"
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
		`; // on affiche le terrain de jeu
		document.querySelector("#gate").style.left = "-100px";
		starships = []; // on vide la liste des fusées
	}

	function createStarship(id) {
		let starship = { playerId: id }; // on crée un nouvel objet fusée

		let sprite = document.createElement("img");
		sprite.className = "starship";
		sprite.src = "/screen/starship.png"; // on ajoute le sprite de la fusée
		sprite.style.top = "0px"; // on positionne la fusée
		sprite.style.filter = "hue-rotate(" + starship.playerId * 80 + "deg)"; // on lui attribue la bonne couleur
		starship.sprite = sprite;

		let starshipsSprites = document.querySelector("#starships");
		starshipsSprites.appendChild(sprite); // on insère le sprite dans le html
		starships.push(starship);

		let starshipsGap = Math.min(50, PLAYER_ZONE / starships.length); // on calcule le nouvel écart entre les fusées
		for (let i = 0; i < starships.length; i++) {
			starships[i].sprite.style.left = i * starshipsGap + "px";
		}

	}
}

const nbJoueurs = 9;

window.onload = function () {

	game = this.document.getElementById("game");
	joueurs = this.document.getElementById("joueurs");

	for (let index = 0; index < nbJoueurs; index++) {
		joueurs.innerHTML += `<span class="joueur"></span>`;

	}


	playerList = this.document.getElementsByClassName("joueur");

	gates.push(this.document.getElementById("topGate"));
	gates.push(this.document.getElementById("hole"));
	gates.push(this.document.getElementById("bottomGate"));


	tableScore = this.document.getElementById("tableScore");

	this.console.log(game);

	height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) * 3 / 4;
	width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	this.console.log(width);
	let y1 = 20, y2 = 30, x = 20;

	score = document.getElementById('score');

	jeu = new Jeu(playerList.length);

	const test = 0;

	if (test) {

		jeu.majGraph();

	} else {
		gameLoop = window.setInterval(function () {
			jeu.majGraph();
		}, 25);
	}
}

let game;
let joueurs;
let gates = [];
const colors = ["#b33", "#bb3", "#3b3", "#3bb", "#33b"];
const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

let playerList = [];
let score;

//1.5em 
const PLAYER_SIZE = 1.5 * 16;

let gameLoop;


let jeu;
let height;
let width;
let canvas;

let x = 50;

let topTube = 10;
let hauteurTube = 0;

let ctx;

let nbTours = 1;

let speed = 0;

let yTarget;
let direction = 0;

let nbVivant;

let tableScore;



const V_MAX = 30;
const v0 = Math.log2(3) ** 2;

/**
 * Classe représentant le jeu dans sa globalité (porte + joueurs)
 */
class Jeu {

	joueurs;

	constructor(nbJoueurs) {

		this.joueurs = [];

		for (let i = 0; i < nbJoueurs; i++) {
			this.joueurs.push(new Joueur(i, playerList[i]));

			tableScore.innerHTML += `<div class='scoreJoueur'>` + names[i] + `</div>`;

		}

		let scoreJoueur = document.getElementsByClassName("scoreJoueur");
		for (let i = 0; i < scoreJoueur.length; i++) {
			scoreJoueur[i].style.background = colors[i % colors.length];
		}




		let ecart = 150;
		this.porte = new Porte(Math.floor(Math.random() * height - ecart), ecart, gate);

		nbVivant = nbJoueurs;
	}


	majGraph() {


		if (speed < V_MAX) {
			speed = Math.log2(nbTours + 2) ** 2;
		}

		speed = 5;
		//Avancement des portes
		//TODO relier à des sockets


		//		this.porte.avancer(speed * 3);


		this.porte.avancer(speed * 5);
		this.porte.majGraph();



		//Avancement des joueurs

		for (const player of this.joueurs) {

			if (player.y < yTarget + player.diametre + 2) {
				direction = 1;
			} else if (player.y > yTarget + this.porte.ecart - (player.diametre + 2)) {
				direction = -1;
			} else {
				direction = 0;
			}

			player.deplacement(Math.floor(Math.random() * 2 * direction * speed / v0));

			//			console.log(player);

			if (!this.porte.collision(width - (20 + player.diametre * player.nb), player.y)) {

				document.getElementsByClassName('scoreJoueur')[player.nb].classList += " out";
				console.log(document.getElementsByClassName('scoreJoueur')[player.nb].classList);
				player.vivant = false;
				nbVivant--;
			}

			player.majGraph();


			//Score


			score.innerHTML = nbTours;

		}
		if (nbVivant == 0) {
			clearInterval(gameLoop);
			document.body.innerHTML = `
			<div id="game">
				<div id="endGame">
					<h1>Fin du jeu </h1>
					<h3> meilleur score : `+ nbTours + `</h3>
				</div>
			</div>
			`;
		}

	}
}

/**
 * Classe représentant le joueur (position + état)
 */

class Joueur {

	nb;
	constructor(nb, objetHTML) {
		this.html = objetHTML;
		this.nb = nb;

		let color = colors[this.nb % colors.length];

		this.y = height / 2;
		this.diametre = 20;
		this.vivant = true;

		this.html.style.background = color;
		this.html.style.boxShadow = color + " -5px 3px 6px";
		this.html.style.left = this.nb * 2 + "em";
	}

	deplacement(y) {
		if (this.y + y < height - this.diametre / 2 && this.y + y > this.diametre / 2) {
			this.y += y;
		}
	}

	majGraph() {
		if (this.vivant) {
			this.html.style.top = this.y - PLAYER_SIZE / 2 + "px";
		} else {
			this.html.style.display = "none";
		}
	}
}


const DIAMETRE_PORTE = 1;

/**
 * Classe représentant la porte (position)
 */

class Porte {
	constructor(hautPorte, ecart, objetHTML) {

		this.hautPorte = hautPorte;
		this.ecart = ecart;

		this.x = width;

		yTarget = this.hautPorte;

		this.html = objetHTML;
	}

	avancer(dx) {
		if (this.x >= width) {
			this.x = 0;

			this.ecart = this.ecart >= 60 ? this.ecart - 5 : this.ecart;
			this.hautPorte = Math.floor(Math.random() * (height - this.ecart * 2)) + this.ecart;

			yTarget = this.hautPorte;

			nbTours++;

			//			console.log(this.hautPorte);
			//			console.log("redemarre");

		} else {
			this.x += dx;
			//			console.log("avance");
		}
	}

	majGraph() {
		gate.style.right = this.x + "px";
		gates[0].style.top = this.hautPorte - (PLAYER_SIZE + DIAMETRE_PORTE) + "px";
		gates[1].style.height = this.ecart + "px";
		gates[2].style.bottom = (height - this.hautPorte - this.ecart - (PLAYER_SIZE + DIAMETRE_PORTE)) + "px";

	}

	collision(x, y) {
		if (this.x > x - 20 && this.x <= x) {
			return (this.hautPorte < y && this.hautPorte + this.ecart > y);
		}
		return (true);
	}
}
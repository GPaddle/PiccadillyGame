window.onload = function () {

	canvas = document.getElementById('canvas');

	canvas.height = 300;
	canvas.width = 700;

	height = canvas.height;
	width = canvas.width;

	score = document.getElementById('score');

	jeu = new Jeu(2);

	gameLoop = window.setInterval(function () {
		jeu.majGraph();
	}, 20);

}

let score;

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




/**
 * Classe représentant le jeu dans sa globalité (porte + joueurs)
 */
class Jeu {

	joueurs;

	constructor(nbJoueurs) {

		this.joueurs = [new Joueur(0)];

		for (let index = 1; index < nbJoueurs; index++) {
			this.joueurs.push(new Joueur(index));
		}
		this.porte = new Porte(20, 100);

		nbVivant = nbJoueurs;
	}


	majGraph() {
		ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, width, height);

		if (speed < 25) {
			speed = Math.log2(nbTours + 2) ** 2;
		}

		//TODO
		this.porte.avancer(speed * 3);
		this.porte.majGraph();


		for (const player of this.joueurs) {

			if (player.y < yTarget + player.diametre + 2) {
				direction = 1;
			} else if (player.y > yTarget + this.porte.ecart - (player.diametre + 2)) {
				direction = -1;
			} else {
				direction = 0;
			}

			player.deplacement(Math.floor(Math.random() * 2 * direction * speed / (Math.log2(3) ** 2)));

			if (!this.porte.collision(20 + player.diametre * player.nb, player.y)) {
				player.vivant = false;
				nbVivant--;
			}
			player.majGraph();

			
			score.innerHTML = nbTours;


			if (nbVivant == 0) {
				clearInterval(gameLoop);

				ctx.clearRect(0, 0, width, height);
				ctx.fillStyle='rgb(100,0,0)';
				ctx.font = '50px sans-serif';
				ctx.fillText('Fin du jeu', 10, 50);
			}
		}

	}
}


/**
 * Classe représentant le joueur (position + état)
 */

class Joueur {

	constructor(nb) {
		this.nb = nb;
		this.y = height / 2;
		this.diametre = 20;
		this.vivant = true;

		this.img = new Image();

		switch (nb) {
			case 0:
				this.img.src = './Ski1.png';
				break;
			case 1:
				this.img.src = './Ski2.png';
				break;
		}
	}

	deplacement(y) {
		if (this.y + y < height - this.diametre / 2 && this.y + y > this.diametre / 2) {
			this.y += y;
		}
	}

	majGraph() {
		if (this.vivant) {

			ctx.fillStyle = 'rgb(' + 100 * this.nb + ',0,0)';
			ctx.beginPath();
			ctx.arc(20 + this.nb * this.diametre, this.y, this.diametre / 2, 0, 2 * Math.PI);
			ctx.fill();

			/*
	
	ctx.drawImage(this.img, 20 + this.nb * this.diametre, this.y - 20);
	*/

			//		ctx.arc(20 + this.nb * 20, this.y, 20, 0, Math.PI * 2, false);

		}
	}
}



/**
 * Classe représentant la porte (position)
 */

class Porte {
	constructor(hautPorte, ecart) {

		this.hautPorte = hautPorte;
		this.ecart = ecart;

		this.x = width;

		yTarget = this.hautPorte;
/*
		this.img = new Image();
		this.img.src = './DrapeauB.png';
		this.img2 = new Image();
		this.img2.src = './DrapeauR.png';
*/
	}

	avancer(dx) {
		if (this.x <= 0) {
			this.x = width;

			this.ecart = this.ecart >= 60 ? this.ecart -= 5 : this.ecart;
			this.hautPorte = Math.floor(Math.random() * (height - this.ecart * 2)) + this.ecart;

			yTarget = this.hautPorte;

			nbTours++;

			//			console.log(this.hautPorte);
			//			console.log("redemarre");

		} else {
			this.x -= dx;
			//			console.log("avance");
		}
	}

	majGraph() {

		ctx.beginPath();
		ctx.fillStyle = '#f00';
		ctx.arc(this.x, this.hautPorte, 5, 0, 2 * Math.PI);
		ctx.fill();

		ctx.beginPath();
		ctx.fillStyle = '#00f';
		ctx.arc(this.x, this.hautPorte + this.ecart, 5, 0, 2 * Math.PI);
		ctx.fill();

		/*
		ctx.drawImage(this.img,this.x,this.hautPorte-10);
		ctx.drawImage(this.img2,this.x,this.hautPorte+this.ecart-10);
	*/
	}

	collision(x, y) {
		if (this.x > x - 20 && this.x <= x) {
			return (this.hautPorte < y && this.hautPorte + this.ecart > y);
		}
		return (true);
	}
}
let nbPlayer = 1;
let sock;

window.onload = function () {
	//création de la partie au chargement de la page
	var game = new Game(nbPlayer);

	//boucle du jeu
	let loop = window.setInterval(function () {
		//si tous les joueurs sont morts alors on arrête la partie
		if (!game.majGame()) {
			clearInterval(loop);
		}
	}, 25);
}

//classe permetant de créer la partie
class Game {
	
	//création de la parite en fonction du nombre de joueurs 
	constructor(nbPlayers) {
		this.players = [];
		//création des joueurs avec un id unique 
		for (var i = 0; i < nbPlayers; i++) {
			this.players.push(new Player(i));
		}

		//création de la porte 
		this.door = new Door(Math.random()*((50-25)+1)+25, Math.random()*200/4, 500);

		this.nbAlive = nbPlayers;

		this.score = 0;

	}

	//suppresssion du joueur quand il est éliminé 
	playerDeath(player) {
		this.players.pop(player);
		this.nbAlive--;
	}

	//maj de la partie
	majGame() {
		if (this.nbAlive>0) {
			this.door.avancer(10+this.score/1000*2);
			for(const pl of this.players) {
				if (pl.getLife()) {
					if (this.door.colision(pl.getY())) {
						pl.setLife(false);
					}
					pl.majHTML();
				}
				else {
					this.playerDeath(pl);
				}
			}
			document.querySelector("#score").innerHTML = ++this.score;
			return true;
		}
		else {
			document.body.innerHTML += "<h2>c fini : "+this.score+"</h2>";
			return false;
		}
	}
}


//permet de créer un joueur 
class Player {

	//constructeur avec un id unique 
	constructor(i) {
		this.id = i;
		this.isAlive = true;

		//insertion du joueur das le dom
		document.querySelector("#joueurs").innerHTML += '<span class=joueur id="id_'+this.id+'"></span>';

		//on récupe l'html pour pouvoir le modifier plus tard 
		this.html = document.querySelector("#id_"+this.id);
		this.y = 0;
		let self = this;
	}

	//permet d'accéder au y
	getY() {
		return this.y;
	}

	//permet de changer le y
	setY(y) {
		this.y = y;
	}

	// change l'état de la vie du joueur
	setLife(bool) {
		this.isAlive = bool;
	}

	//permet d'acceder à l'état de la vie du joueur 
	getLife() {
		return this.isAlive;
	}

	//permet de mettre à jour la position du joueur 
	majHTML() {
		this.setY(document.querySelector("#range").value);
		if (this.isAlive){
			this.html.style.top = this.y +"px";
		}
		else {
			this.html.style.display = "none";
		}
	}
} 

//permet de créer une porte 
class Door {

	//construit une porte avec l'écart, la hauteur, et le x des abcisse
	constructor(e,h,x) {
		this.ecart = e;
		this.haut = h;
		this.x = x;
		this.width = document.querySelector("#game").clientWidth;

		//insere une porte dans le dom
		document.querySelector("#gate").innerHTML += '<span class="door"><div id="hole"></div></span>';
		this.html = document.querySelector(".door");
		this.html2 = document.querySelector("#hole");
		this.html2.style.top = this.haut+"px";
		this.html2.style.height = this.ecart+"px";
		this.html.style.left = this.x+"px";
	}

	//permet de faire avancer la porte 
	avancer(vitesse) {
		if (this.x < -55) {
			this.x = this.width-20;
			this.haut = Math.random()*200/2;
			this.ecart = Math.random()*((50-25)+1)+25;
		}
		else {
			this.x -= vitesse;
		}
		this.majHTML();
	}

	//permet de voir si un joueur entre en colision avec une porte 
	colision(playerY) {
		if (this.x < 10 && (playerY < this.haut || playerY > (this.haut+this.ecart))) {
			return true;
		}
		else {
			return false;
		}
	}

	//met à jour de dom
	majHTML() {
		this.html.style.left = this.x+"px";
		this.html2.style.top = this.haut+"px";
		this.html2.style.height = this.ecart+"px";
		
	}
}
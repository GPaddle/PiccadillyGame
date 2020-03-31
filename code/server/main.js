"use strict";

const http = require("http"); // bibliothèque native http pour servir les fichiers
const fs = require("fs"); // bibliothèque native filesystem pour lire les fichiers
const startWebSocket = require("./websocket.js"); // fonction qui lance le serveur websocket (fichier server/websocket.js)

const conf = JSON.parse(fs.readFileSync("conf/conf.json")); // on lit le fichier json de configuration dans un objet

const httpServer = http.createServer(); // on crée le serveur http
httpServer.listen(conf.port); // on lance l'écoute du serveur sur le port choisi dans le fichier de configuration

httpServer.on("request", function (req, res) { // évènement qui se déclenche quand on reçoit une requête http
	function send(url, type) { // la fonction send envoit le fichier se trouvant à l'url donné avec l'en-tête http Content-Type donné (text/html pour un fichier html par exemple)
		res.setHeader("Content-Type", type);
		let file = fs.createReadStream(url);
		file.pipe(res);
	}

	switch (req.url) { // on associe chaque url à une action (envoyer tels fichiers)
		case "/": res.end("Piccadilly Game"); break;

		case "/play": send("client/play/play.html", "text/html"); break;
		case "/screen": send("client/screen/screen.html", "text/html"); break;
		case "/play.css": send("client/play/play.css", "text/css"); break;
		case "/play.js": send("client/play/play.js", "application/javascript"); break;
		case "/play/game.js": send("client/play/" + conf.game + ".js", "application/javascript"); break;
		case "/play/starship.png": send("client/play/starship.png", "image/png"); break;
		case "/qrious.js": send("node_modules/qrious/dist/qrious.js", "application/javascript"); break;
		case "/screen.js": send("client/screen/screen.js", "application/javascript"); break;
		case "/screen/game.js": send("client/screen/" + conf.game + ".js", "application/javascript"); break;
		case "/screen/background.svg": send("client/screen/assets/background/background.svg", "image/svg+xml"); break;
		case "/screen/moon.svg": send("client/screen/assets/background/moon.svg", "image/svg+xml"); break;
		case "/screen/stars1.svg": send("client/screen/assets/background/stars1.svg", "image/svg+xml"); break;
		case "/screen/stars2.svg": send("client/screen/assets/background/stars2.svg", "image/svg+xml"); break;
		case "/screen/laser-top.png": send("client/screen/assets/laser-top.png", "image/png"); break;
		case "/screen/starship.png": send("client/screen/assets/starship.png", "image/png"); break;
		case "/screen.css": send("client/screen/screen.css", "text/css"); break;
		case "/fonts/lato": send("client/fonts/lato/lato.ttf", "font/ttf"); break;
		case "/fonts/lato-bold": send("client/fonts/lato/lato-bold.ttf", "font/ttf"); break;

		default: // si l'url n'existe pas, on envoit un message d'erreur 404
			res.statusCode = 404;
			res.end("Page inexistante");
			break;
	}
});

startWebSocket(httpServer, conf);
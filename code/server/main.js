"use strict";

const http = require("http");
const fs = require("fs");
const startWebSocket = require("./websocket.js");

const conf = JSON.parse(fs.readFileSync("conf/conf.json"));

const httpServer = http.createServer();
httpServer.listen(conf.port);

httpServer.on("request", function(req, res) {
	function send(url, type) {
		res.setHeader("Content-Type", type);
		let file = fs.createReadStream(url);
		file.pipe(res);
	}

	switch (req.url) {
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

		default: {
			res.statusCode = 404;
			res.end("Page inexistante");
			break;
		}
	}
});

startWebSocket(httpServer, conf);
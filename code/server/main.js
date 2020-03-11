"use strict";

const http = require("http");
const fs = require("fs");
const startWebSocket = require("./websocket.js");

const conf = JSON.parse(fs.readFileSync("conf/conf.json"));

const httpServer = http.createServer();
httpServer.listen(conf.port);

httpServer.on("request", function(req, res) {
	switch (req.url) {
		case "/": {
			res.end("Piccadilly Game");
			break;
		}

		case "/play": {
			res.setHeader("Content-Type", "text/html");
			let file = fs.createReadStream("client/play/play.html");
			file.pipe(res);
			break;
		}

		case "/screen": {
			res.setHeader("Content-Type", "text/html");
			let file = fs.createReadStream("client/screen/screen.html");
			file.pipe(res);
			break;
		}

		case "/play.css": {
			res.setHeader("Content-Type", "text/css");
			let file = fs.createReadStream("client/play/play.css");
			file.pipe(res);
			break;
		}

		case "/play.js": {
			res.setHeader("Content-Type", "application/javascript");
			let file = fs.createReadStream("client/play/play.js");
			file.pipe(res);
			break;
		}

		case "/play/game.js": {
			res.setHeader("Content-Type", "application/javascript");
			let file = fs.createReadStream("client/play/" + conf.game + ".js");
			file.pipe(res);
			break;
		}

		case "/qrious.js": {
			res.setHeader("Content-Type", "application/javascript");
			let file = fs.createReadStream("node_modules/qrious/dist/qrious.js");
			file.pipe(res);
			break;
		}

		case "/screen.js": {
			res.setHeader("Content-Type", "application/javascript");
			let file = fs.createReadStream("client/screen/screen.js");
			file.pipe(res);
			break;
		}

		case "/screen/game.js": {
			res.setHeader("Content-Type", "application/javascript");
			let file = fs.createReadStream("client/screen/" + conf.game + ".js");
			file.pipe(res);
			break;
		}

		case "/screen/background.svg": {
			res.setHeader("Content-Type", "image/svg+xml");
			let file = fs.createReadStream("client/screen/assets/background/background.svg");
			file.pipe(res);
			break;
		}

		case "/screen/moon.svg": {
			res.setHeader("Content-Type", "image/svg+xml");
			let file = fs.createReadStream("client/screen/assets/background/moon.svg");
			file.pipe(res);
			break;
		}

		case "/screen/stars1.svg": {
			res.setHeader("Content-Type", "image/svg+xml");
			let file = fs.createReadStream("client/screen/assets/background/stars1.svg");
			file.pipe(res);
			break;
		}

		case "/screen/stars2.svg": {
			res.setHeader("Content-Type", "image/svg+xml");
			let file = fs.createReadStream("client/screen/assets/background/stars2.svg");
			file.pipe(res);
			break;
		}

		case "/screen/laser_top.png": {
			res.setHeader("Content-Type", "image/png");
			let file = fs.createReadStream("client/screen/assets/laser_top.png");
			file.pipe(res);
			break;
		}

		case "/screen/starship.png": {
			res.setHeader("Content-Type", "image/png");
			let file = fs.createReadStream("client/screen/assets/starship.png");
			file.pipe(res);
			break;
		}

		case "/screen.css": {
			res.setHeader("Content-Type", "text/css");
			let file = fs.createReadStream("client/screen/screen.css");
			file.pipe(res);
			break;
		}

		case "/fonts/lato": {
			res.setHeader("Content-Type", "font/ttf");
			res.setHeader("Content-Length", 75136);
			let file = fs.createReadStream("client/fonts/lato/lato.ttf");
			file.pipe(res);
			break;
		}

		case "/fonts/lato-bold": {
			res.setHeader("Content-Type", "font/ttf");
			res.setHeader("Content-Length", 73316);
			let file = fs.createReadStream("client/fonts/lato/lato-bold.ttf");
			file.pipe(res);
			break;
		}

		default: {
			res.statusCode = 404;
			res.end("Page inexistante");
			break;
		}
	}
});

startWebSocket(httpServer, conf);
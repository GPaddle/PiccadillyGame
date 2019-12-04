const http = require("http");
const fs = require("fs");
const ws = require("ws");

const httpServer = http.createServer();
httpServer.listen(8080);

httpServer.on("request", function(req, res) {
	switch(req.url) {
		case "/": {
			res.end("Piccadilly Game");
			break;
		}

		case "/play": {
			res.setHeader("Content-Type", "text/html");
			let file = fs.createReadStream("client/play.html");
			file.pipe(res);
			break;
		}

		case "/play/": {
			res.writeHead(302, {"Location": "/play"});
			res.end();
			break;
		}

		case "/screen": {
			res.setHeader("Content-Type", "text/html");
			let file = fs.createReadStream("client/screen.html");
			file.pipe(res);
			break;
		}

		case "/style": {
			res.setHeader("Content-Type", "text/css");
			let file = fs.createReadStream("client/style.css");
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

		case "/fonts/lato/bold": {
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
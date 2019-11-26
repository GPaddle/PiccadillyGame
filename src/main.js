const http = require("http");
const ws = require("ws");

let server = http.createServer();

server.on("request", function(req, res) {
	if(req.url == "/") {
		res.end("Piccadilly Game");
	} else if(req.url == "/play") {
		res.end("Page de jeu");
	} else if(req.url == "/play/") {
		res.writeHead(302, {"Location": "/play"});
		res.end();
	} else {
		res.statusCode = 404;
		res.end("Page inexistante");
	}
})

server.listen(8080);
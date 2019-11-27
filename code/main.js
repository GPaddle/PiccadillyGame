const http = require("http");
const fs = require("fs");
const ws = require("ws");

let httpServer = http.createServer();
httpServer.listen(8080);

httpServer.on("request", function(req, res) {
	if(req.url == "/") {
		res.end("Piccadilly Game");
	} else if(req.url == "/play") {
		res.setHeader("Content-Type", "text/html");
		let file = fs.createReadStream("play.html");
		file.pipe(res);
	} else if(req.url == "/play/") {
		res.writeHead(302, {"Location": "/play"});
		res.end();
	} else {
		res.statusCode = 404;
		res.end("Page inexistante");
	}
});
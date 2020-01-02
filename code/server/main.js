const http = require("http");
const fs = require("fs");
const startWebSocket = require("./websocket.js");

const key = "2a50e397ad42ed24";

const httpServer = http.createServer();
httpServer.listen(8082) // On ouvre l'écoute sur le port 8082 pour ne pas concurrencer d'autres serveurs lancés classiquement sur 8080 : WAMP

httpServer.on("request", function(req, res) {
    switch (req.url) {
        case "/":
            {
                res.end("Piccadilly Game");
                break;
            }

        case "/play":
            {
                res.setHeader("Content-Type", "text/html");
                let file = fs.createReadStream("client/play/play.html");
                file.pipe(res);
                break;
            }

        case "/screen/" + key:
            {
                res.setHeader("Content-Type", "text/html");
                let file = fs.createReadStream("client/screen/screen.html");
                file.pipe(res);
                break;
            }

        case "/play.css":
            {
                res.setHeader("Content-Type", "text/css");
                let file = fs.createReadStream("client/play/play.css");
                file.pipe(res);
                break;
            }

        case "/play.js":
            {
                res.setHeader("Content-Type", "application/javascript");
                let file = fs.createReadStream("client/play/play.js");
                file.pipe(res);
                break;
            }

        case "/screen.js":
            {
                res.setHeader("Content-Type", "application/javascript");
                let file = fs.createReadStream("client/screen/screen.js");
                file.pipe(res);
                break;
            }

        case "/screen.css":
            {
                res.setHeader("Content-Type", "text/css");
                let file = fs.createReadStream("client/screen/screen.css");
                file.pipe(res);
                break;
            }

        case "/fonts/lato":
            {
                res.setHeader("Content-Type", "font/ttf");
                res.setHeader("Content-Length", 75136);
                let file = fs.createReadStream("client/fonts/lato/lato.ttf");
                file.pipe(res);
                break;
            }

        case "/fonts/lato-bold":
            {
                res.setHeader("Content-Type", "font/ttf");
                res.setHeader("Content-Length", 73316);
                let file = fs.createReadStream("client/fonts/lato/lato-bold.ttf");
                file.pipe(res);
                break;
            }

        default:
            {
                res.statusCode = 404;
                res.end("Page inexistante");
                break;
            }
    }
});

startWebSocket(httpServer);
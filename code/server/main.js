//Require de toutes les dépendances
var http = require('http');
var app = require('express')();
var fs = require('fs');
var server = http.createServer(app);
var io = require('socket.io').listen(server);


//Init de la liste
var joueurs = [];
var reponses = [];

/*
Création des routes 
    - URL qui sert d'index /play
    - Tous les autres URL redirigent sur /play
*/
app.get('/play', function(req, res) {
    //Chargement de la page index
    fs.readFile('client/play.html', 'utf-8', function(error, content) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
    });
})

.get('/play/style.css', function(req, res) {
    //Chargement de la page index
    fs.readFile('client/style.css', 'utf-8', function(error, content) {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(content);
    });
})

.get('/play/:numQuestion/:numReponse', function(req, res) {
    reponses[4 * numQuestion + numReponse]++;
    res.redirect("/play");
})

.use(function(req, res, next) {
    res.redirect('/play');
})

let duréeAttente = 30;

let date = new Date().getTime() + duréeAttente * 1000;


//Utilisation des sockets
io.sockets.on('connection', function(socket) {

    socket.emit('init', joueurs.length);
    socket.emit('initDate', date)

    socket.on('reponse', function(index) {
        lis[index]++;
        socket.broadcast.emit('update', lis);
    });

    socket.on('newUser', function(txt) {
        joueurs.push(txt);

        //TODO
        // Stocker le fait que l'utilisateur ait entré un pseudo puis l'empecher de rentrer à nouveau un pseudo (disabled sur le boutton/input)
        socket.broadcast.emit('nvJoueurs', joueurs.length);
        console.log(txt);
    });

});

//On ouvre l'écoute sur le port 8082 
//(Pour ne pas concurrencer d'autres serveurs lancés classiquement sur 8080 : WAMP)
server.listen(8082);
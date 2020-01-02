const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;
const START_GAME = 4; 

const State = {
    NONE: 0,
    WAITING_ROOM: 1,
    AUTH: 2,
    PSEUDO: 3,
    GAME: 4,
};

const questions = [
    [
        "Comment s'appelait le président des États-Unis en 1995 ?", // intitulé de la question
        [ // réponses possibles
            "Barack Obama",
            "Jimmy Carter",
            "Georges H. W. Bush",
            "Bill Clinton"
        ],
        4, // numéro de la bonne réponse
        20 // temps en secondes que les joueurs ont pour répondre à cette question
    ],

    [
        "En quelle année le premier iPhone est sorti ?",
        [
            2005,
            2007,
            2013,
            2009
        ],
        2,
        15
    ],

    [
        "Quel est le plus haut bâtiment de Paris ?",
        [
            "l'hôtel Hyatt Regency",
            "la Tour Eiffel",
            "la tour Montparnasse",
            "le dôme des Invalides"
        ],
        2,
        10,
    ],

    [
        "Combien de fois la chanson All I Want for Christmas Is You de Mariah Carey a-t-elle été écoutée sur Spotify ?",
        [
            "entre 200 millions et 400 millions",
            "entre 500 millions et 600 millions",
            "entre 1 milliard et 2 milliards",
            "entre 600 et 700 millions"
        ],
        4,
        6
    ],

    [
        "De quelle région, pays ou ville vient la raclette ?",
        [
            "Annecy",
            "Haute-Savoie",
            "Savoie",
            "Suisse"
        ],
        4,
        5
    ]
];

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const MIN_PLAYER = 2;

module.exports = function(httpServer) {
    const wss = new ws.Server({ server: httpServer });

    let screenSock;
    const playersSocks = [];

    let state = State.WAITING_ROOM;

    let nextPlayerId = 0;

    let actualQuestion = -1;

    let gameWillStart = false;

    function startGame() {
        for(playerSock of playersSocks) {
            playerSock.send(JSON.stringify([START_GAME])); // on dit aux joueurs que la partie commence (pour qu'ils affichent l'interface des questions)
        }

        screenSock.send(JSON.stringify([START_GAME]));

        function nextQuestion() {
            actualQuestion++;

            for(playerSock of playersSocks) {
                playerSock.send(JSON.stringify([questions[actualQuestion][3]]));
            }

            screenSock.send(JSON.stringify(questions[actualQuestion]));

            if(actualQuestion < questions.length - 1) {
                setTimeout(nextQuestion, questions[actualQuestion][3] * 1000);
            }
        }

        nextQuestion(); // on envoit la première question
    }

    wss.on("connection", function(sock) {
        if (state == State.WAITING_ROOM) {
            sock.state = State.AUTH;

            sock.on("message", function(json) {
                let msg = JSON.parse(json);
                
                switch (state) {
                    case State.WAITING_ROOM:
                        switch (sock.state) {
                            case State.AUTH:
                                if (msg[0] == CLIENT_TYPE_PLAYER) {
                                    sock.player = {};
                                    sock.player.id = nextPlayerId;
                                    nextPlayerId++;

                                    sock.player.pseudo = "???";

                                    playersSocks.push(sock);

                                    screenSock.send(JSON.stringify([ADD_PLAYER]));

                                    let players = [];

                                    for (playerSock of playersSocks) {
                                        players.push(playerSock.player);
                                        playerSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo]));
                                    }

                                    sock.send(JSON.stringify([MIN_PLAYER, players, sock.player.id]));

                                    if(playersSocks.length >= MIN_PLAYER && !gameWillStart) {
                                        setTimeout(startGame, 15000); // quand on a assez de joueurs on lance la partie dans 15 secondes
                                        gameWillStart = true;
                                    }

                                    sock.state = State.PSEUDO;
                                } else if (msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY) {
                                    screenSock = sock;
                                    sock.state = State.NONE;

                                    sock.send(JSON.stringify([MIN_PLAYER, playersSocks.length]));
                                }

                                break;

                            case State.PSEUDO:
                                let isPseudoFree = true;

                                for (playerSock of playersSocks) {
                                    if (msg[0] == playerSock.player.pseudo) {
                                        isPseudoFree = false;
                                        break;
                                    }
                                }

                                if (isPseudoFree) {
                                    sock.player.pseudo = msg[0];

                                    for (playerSock of playersSocks) {
                                        playerSock.send(JSON.stringify([SET_PSEUDO, sock.player.id, sock.player.pseudo]));
                                    }

                                    sock.state = State.NONE;
                                } else {
                                    sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
                                }

                                break;
                        }

                        break;
                }
            });

            sock.on("close", function() {
                if (state == State.WAITING_ROOM && sock.player) {
                    playersSocks.splice(playersSocks.indexOf(sock), 1);

                    screenSock.send(JSON.stringify([DEL_PLAYER]));

                    for (playerSock of playersSocks) {
                        playerSock.send(JSON.stringify([DEL_PLAYER, sock.player.id]));
                    }
                }
            });
        }
    });
}
const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;

const states = {
    NONE: 0,
    WAITING_ROOM: 1,
    AUTH: 2,
    PSEUDO: 3,
    GAME: 4,
};

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const MIN_PLAYER = 1;

module.exports = function(httpServer) {
    const wss = new ws.Server({ server: httpServer });

    let screenSock;
    const playersSocks = [];

    let state = states.WAITING_ROOM;

    let nextPlayerId = 0;

    wss.on("connection", function(sock) {
        if (state == states.WAITING_ROOM) {
            sock.state = states.AUTH;

            sock.on("message", function(json) {
                let msg = JSON.parse(json);
                console.log("Websocket : " + msg);

                switch (state) {
                    case states.WAITING_ROOM:
                        switch (sock.state) {
                            case states.AUTH:
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

                                    sock.state = states.PSEUDO;

                                } else if (msg[0] == CLIENT_TYPE_SCREEN && msg[1] == SCREEN_SECRET_KEY) {
                                    screenSock = sock;
                                    sock.state = states.NONE;

                                    sock.send(JSON.stringify([MIN_PLAYER, playersSocks.length]));
                                }

                                break;

                            case states.PSEUDO:
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
                                        /**
                                         * JSON
                                         * 
                                         * pseudo
                                         * idPlayer
                                         * pseudoPlayer
                                         */
                                        playerSock.send(JSON.stringify([SET_PSEUDO, sock.player.id, sock.player.pseudo]));
                                    }

                                    sock.state = states.NONE;
                                    if (playersSocks.length >= MIN_PLAYER) {
                                        console.log(state + " -> " + states.GAME);
                                        state = states.GAME;
                                    }

                                } else {
                                    sock.send(JSON.stringify([PSEUDO_ALREADY_USED]));
                                }

                                break;


                        }



                        break;
                    case states.GAME:

                        for (playerSocks of playersSocks) {
                            playerSock.state = states.GAME;
                        }

                        console.log(msg);
                        screenSock.send(JSON.stringify(msg));
                        break;
                }
            });

            sock.on("close", function() {
                if (state == states.WAITING_ROOM && sock.player) {
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
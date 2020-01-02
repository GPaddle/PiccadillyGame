const ws = require("ws");

const CLIENT_TYPE_PLAYER = 0;
const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;

const State = {
    NONE: 0,
    WAITING_ROOM: 1,
    AUTH: 2,
    PSEUDO: 3,
    GAME: 4,
};

const SCREEN_SECRET_KEY = "7116dd23254dc1a8";

const MIN_PLAYER = 2;

module.exports = function(httpServer) {
    const wss = new ws.Server({ server: httpServer });

    let screenSock;
    const playersSocks = [];

    let state = State.WAITING_ROOM;

    let nextPlayerId = 0;

    wss.on("connection", function(sock) {
        if (state == State.WAITING_ROOM) {
            sock.state = State.AUTH;

            sock.on("message", function(json) {
                let msg = JSON.parse(json);
                console.log(msg);
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

                        /*
                        					case State.GAME:
                        						switch (sock.state) {
                        							case State.
                        						}
                        */
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
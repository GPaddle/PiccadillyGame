"use strict";

const CLIENT_TYPE_SCREEN = 1;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const ADD_PLAYER = 0;
const DEL_PLAYER = 2;
const START_GAME = 4;

const State = {
    GAME_INFO: 0,
    WAITING_ROOM: 1,
    GAME: 2,
}

window.onload = function() {
    document.body.innerHTML = `
    <div id="service-name">Piccadilly Game</div>
    <div id="join-invitation">Rejoignez la partie sur http://` + window.location.host + `/play</div>
    <div id="player-infos">
        <div class="player-info" id="player-info-first">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">0</span></div>
        <div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="min-players">...</span></div>
    </div>
    `;

    let connectedPlayersCountHtml = document.getElementById("connected-players");
    let minPlayersCountHtml = document.getElementById("min-players");

    let questionNumberHtml;
    let questionHtml;

    let remainingTimeHtml;

    let answersHtml;

    function displayGame() {
        document.body.innerHTML = `
        <div id="question-number">Question ...</div>
        <div id="question">...</div>
        <div id="remaining-time">Temps restant : <span id="remaining-time-value">...</span></div>
        <div class="answer">
            <span class="answer-letter">A - </span>
            <span class="answer-text">...</div>
        </div>
        <div class="answer">
            <span class="answer-letter">B - </span>
            <span class="answer-text">...</div>
        </div>
        <div class="answer">
            <span class="answer-letter">C - </span>
            <span class="answer-text">...</div>
        </div>
        <div class="answer">
            <span class="answer-letter">D - </span>
            <span class="answer-text">...</div>
        </div>
        `;

        questionNumberHtml = document.getElementById("question-number");
        questionHtml = document.getElementById("question");

        remainingTimeHtml = document.getElementById("remaining-time-value");

        answersHtml = document.getElementsByClassName("answer-text");
    }

    const sock = new WebSocket("ws://" + window.location.host);

    sock.onopen = function() {
        let state = State.GAME_INFO;

        let playersNumber = 0;
        let minPlayersCount = 0;

        let gameWillStart = false;

        let questionNumber = 0;
        let questionCountDown;

        let stats = [0, 0, 0, 0];

        sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            switch (state) {
                case State.GAME_INFO:
                    minPlayersCount = msg[0];
                    minPlayersCountHtml.innerHTML = minPlayersCount;

                    playersNumber = msg[1];
                    connectedPlayersCountHtml.innerHTML = playersNumber;

                    state = State.WAITING_ROOM;
                    break;

                case State.WAITING_ROOM:
                    if (msg[0] == ADD_PLAYER) {
                        playersNumber++;
                        connectedPlayersCountHtml.innerHTML = playersNumber;
                    } else if (msg[0] == DEL_PLAYER) {
                        playersNumber--;
                        connectedPlayersCountHtml.innerHTML = playersNumber;
                    } else if (msg[0] == START_GAME) {
                        displayGame();
                        state = State.GAME;
                    }

                    break;
                case State.GAME:
                    clearInterval(questionCountDown);

                    questionNumber++;
                    questionNumberHtml.innerHTML = "Question " + questionNumber;

                    questionHtml.innerHTML = msg[0];

                    for(let i = 0; i < 4; i++) {
                        answersHtml[i].innerHTML = msg[1][i];
                    }

                    let count = msg[3];
                    remainingTimeHtml.innerHTML = count;

                    questionCountDown = setInterval(function() {
                        count--;
                        remainingTimeHtml.innerHTML = count;

                        if(count == 0) {
                            clearInterval(questionCountDown);
                        }
                    }, 1000);

                    stats[msg[0]]++;
                    console.log(stats);
                    break;
            }
        }
    }
}
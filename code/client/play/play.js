"use strict";

const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;
const START_GAME_COUNTDOWN = 4;
const START_GAME = 5;

const ANSWERS_STATS = 0;
const END_QUESTION = 1;

const STATE_NONE = 0,
    STATE_GAME_INFO = 1,
    STATE_PLAYER_LIST = 2,
    STATE_WAITING_ROOM = 3,
    STATE_WAIT_QUESTION = 4,
    STATE_ANSWER = 5;

window.onload = function() {
    document.body.innerHTML = `
	<div id="players-info">Nombre de joueurs connectés : <span id="players-count">...</span></div>
	<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>

	<div id="player-pseudo-info">Votre pseudo est <span id="player-pseudo">...</span></div>
	<input id="pseudo-input" type="text" placeholder="Entrez votre pseudo" required autofocus>
	<div id="pseudo-error"></div>
	<div id="send-pseudo-button">Envoyer</div>

	<div id="player-list-header">Joueurs connectés</div>
	<div id="player-list">

	</div>
	`;

    let playersCountHtml = document.getElementById("players-count");
    let minPlayersCountHtml = document.getElementById("min-players-count");

    let playerPseudoInfoHtml = document.getElementById("player-pseudo-info");

    let pseudoInputHtml = document.getElementById("pseudo-input");
    let pseudoErrorHtml = document.getElementById("pseudo-error");
    let sendPseudoButtonHtml = document.getElementById("send-pseudo-button");

    let playerPseudoHtml = document.getElementById("player-pseudo");
    let playersListHtml = document.getElementById("player-list");

    pseudoInputHtml.onfocus = function() {
        pseudoErrorHtml.innerHTML = "";
    }

    sendPseudoButtonHtml.onclick = function() {
        sock.send(JSON.stringify([pseudoInputHtml.value]));
        pseudoErrorHtml.innerHTML = "";
    };

    let questionNumberHtml;
    let questionInfoHtml;

    let answersButtonsHtml;
    let answersStatsHtml;

    let clickedAnswerButtonHtml;

    let sock = new WebSocket("ws://" + window.location.host);

    let minPlayersCount;

    sock.onopen = function() {
        let state = STATE_GAME_INFO;
        let players; // tableau des pseudos de joueurs

        let minPlayersCount = 0;

        let meId; // mon identifiant de joueur

        let actualQuestion = 0;
        let questionCountdown;

        sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

        function displayGame() {
            document.body.innerHTML = `
			<div id="question-number">Question 1</div>
			<div id="question-info"></div>
			<div id="answer-button1"class="answer-button">
				<div class="answer-letter">A</div>
				<div class="answer-stat">0%</div>
			</div>
			<div id="answer-button2"class="answer-button">
				<div class="answer-letter">B</div>
				<div class="answer-stat">0%</div>
			</div>
			<div id="answer-button3"class="answer-button">
				<div class="answer-letter">C</div>
				<div class="answer-stat">0%</div>
			</div>
			<div id="answer-button4"class="answer-button">
				<div class="answer-letter">D</div>
				<div class="answer-stat">0%</div>
			</div>
			`;

            resetAnswers();

            questionNumberHtml = document.getElementById("question-number");
            questionInfoHtml = document.getElementById("question-info");

            answersButtonsHtml = document.getElementsByClassName("answer-button");
            answersStatsHtml = document.getElementsByClassName("answer-stat");

            for (let i = 0; i < 4; i++) {
                answersButtonsHtml[i].onclick = function() {
                    if (clickedAnswerButtonHtml === undefined && state == STATE_ANSWER) {
                        clickedAnswerButtonHtml = answersButtonsHtml[i];
                        clickedAnswerButtonHtml.style.border = "solid 2px #fefefe";

                        sock.send(JSON.stringify([i])); // on envoit le numéro de la réponse sélectionnée
                    }
                }
            }
        }

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            switch (state) {
                case STATE_GAME_INFO:
                    {
                        minPlayersCount = msg[0];
                        minPlayersCountHtml.innerHTML = minPlayersCount;

                        players = msg[1];
                        playersCountHtml.innerHTML = players.length;

                        meId = msg[2];

                        for (let player of players) {
                            player.lineHtml = document.createElement("div");
                            player.lineHtml.classList.add("player-list-player");
                            player.lineHtml.innerHTML = player.pseudo;

                            playersListHtml.appendChild(player.lineHtml);

                            if (player.id == meId) {
                                playerPseudoHtml.innerHTML = player.pseudo;
                            }
                        }

                        state = STATE_WAITING_ROOM;
                        break;
                    }

                case STATE_WAITING_ROOM:
                    {
                        if (msg[0] == ADD_PLAYER) {
                            let player = {
                                id: msg[1],
                                pseudo: msg[2]
                            };

                            players.push(player);

                            player.lineHtml = document.createElement("div");
                            player.lineHtml.classList.add("player-list-player");
                            player.lineHtml.innerHTML = player.pseudo;

                            playersListHtml.appendChild(player.lineHtml);

                            playersCountHtml.innerHTML = players.length;
                        } else if (msg[0] == SET_PSEUDO) {
                            for (let player of players) { // on récupère le joueur concerné grâce à son id
                                if (player.id == msg[1]) {
                                    player.pseudo = msg[2]; // on change le pseudo du joueur
                                    player.lineHtml.innerHTML = player.pseudo; // on met à jour la liste des joueurs HTML

                                    if (player.id == meId) {
                                        playerPseudoHtml.innerHTML = player.pseudo;
                                    }

                                    break;
                                }
                            }
                        } else if (msg[0] == DEL_PLAYER) {
                            for (let player of players) {
                                if (player.id == msg[1]) {
                                    player.lineHtml.remove();
                                    players.splice(players.indexOf(player), 1);

                                    playersCountHtml.innerHTML = players.length;
                                }
                            }
                        } else if (msg[0] == PSEUDO_ALREADY_USED) {
                            pseudoError.innerHTML = "Ce pseudo est déjà utilisé";
                        } else if (msg[0] == START_GAME_COUNTDOWN) {
                            let countdownInfoHtml = document.createElement("div");
                            countdownInfoHtml.id = "start-countdown-info";

                            let textNode = document.createTextNode("La partie commence dans ");
                            countdownInfoHtml.appendChild(textNode);

                            let time = msg[1];

                            let countdownHtml = document.createElement("span");
                            countdownHtml.id = "start-countdown";
                            countdownHtml.innerHTML = time;

                            countdownInfoHtml.appendChild(countdownHtml);
                            document.body.insertBefore(countdownInfoHtml, playerPseudoInfoHtml)

                            let countdown = setInterval(function() {
                                time--;
                                countdownHtml.innerHTML = time;

                                if (time == 0) {
                                    clearInterval(countdown);
                                }
                            }, 1000);
                        } else if (msg[0] == START_GAME) {
                            displayGame();
                            state = STATE_WAIT_QUESTION;
                        }

                        break;
                    }

                case STATE_WAIT_QUESTION:
                    {
                        if (clickedAnswerButtonHtml !== undefined) {
                            clickedAnswerButtonHtml.style.border = "";
                            clickedAnswerButtonHtml = undefined;
                        }

                        for (let answerStatHtml of answersStatsHtml) {
                            answerStatHtml.innerHTML = "";
                        }

                        actualQuestion++;
                        questionNumberHtml.innerHTML = "Question " + actualQuestion;

                        resetAnswers();

                        clearInterval(questionCountdown);

                        let time = msg[0];

                        questionInfoHtml.innerHTML = "Temps restant : <span id=\"question-countdown\"></span>"

                        let questionCountdownHtml = document.getElementById("question-countdown");
                        questionCountdownHtml.innerHTML = time;

                        questionCountdown = setInterval(function() {
                            time--;
                            questionCountdownHtml.innerHTML = time;

                            if (time == 0) {
                                clearTimeout(questionCountdown);
                            }
                        }, 1000);

                        state = STATE_ANSWER;
                        break;
                    }

                case STATE_ANSWER:
                    {
                        if (msg[0] == ANSWERS_STATS) {
                            for (let i = 0; i < 4; i++) {
                                answersStatsHtml[i].innerHTML = msg[1][i] + "%";
                            }
                        } else if (msg[0] == END_QUESTION) {

                            answerDisplay(msg);

                            if (msg[1]) {
                                questionInfoHtml.innerHTML = "Bonne réponse !";
                            } else {
                                questionInfoHtml.innerHTML = "Mauvaise réponse...";
                            }

                            state = STATE_WAIT_QUESTION;
                        }

                        break;
                    }
            }
        };
    };
}



//Changement de la couleur des boutons selon la réponse
function answerDisplay(msg) {
    let buttonList = getLabels();
    colorButtons(buttonList, "#BB0B0B");

    buttonList[msg[2]].style.backgroundColor = "#22780F";
}

//Changement de la couleur des boutons avec la couleur par défaut
function resetAnswers() {
    let buttonList = getLabels();
    colorButtons(buttonList, "#a65050");
}

//Remplissage d'une liste de boutons
function getLabels() {
    let buttonList = new Array();
    buttonList[0] = document.getElementById("answer-button1");
    buttonList[1] = document.getElementById("answer-button2");
    buttonList[2] = document.getElementById("answer-button3");
    buttonList[3] = document.getElementById("answer-button4");

    return buttonList;
}

//Coloration des boutons
function colorButtons(buttonList, color) {
    for (const bouton in buttonList) {
        const element = buttonList[bouton];
        element.style.backgroundColor = color;
    }
}
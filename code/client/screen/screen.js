"use strict";

const CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0;
const DEL_PLAYER = 2;
const START_GAME_COUNTDOWN = 4;
const START_GAME = 5;

const NEW_QUESTION = 0,
    END_GAME = 3;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const STATE_GAME_INFO = 0,
    STATE_WAITING_ROOM = 1,
    STATE_WAIT_QUESTION = 2,
    STATE_ANSWER = 3,
    STATE_RESULTS = 4;

window.onload = function() {
    document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="join-invitation">Rejoignez la partie sur http://` + window.location.host + `/play</div>
	<div id="players-info">Nombre de joueurs connectés : <span id="players-count">0</span></div>
	<div id="min-players-info">Nombre de joueurs minimum nécessaires : <span id="min-players-count">...</span></div>
	`;

    let playersInfoHtml = document.getElementById("players-info");

    let playersCountHtml = document.getElementById("players-count");
    let minPlayersCountHtml = document.getElementById("min-players-count");

    let questionNumberHtml;
    let questionHtml;
    let questionInfoHtml;

    let answersHtml;
    let answersTextHtml;

    function displayGame() {
        document.body.innerHTML = `
		<div id="question-number">Question ...</div>
		<div id="question">...</div>
		<div id="question-info"></div>
		<div id="answer1" class="answer">
			<span class="answer-letter">A - </span>
			<span class="answer-text">...</div>
		</div>
		<div id="answer2" class="answer">
			<span class="answer-letter">B - </span>
			<span class="answer-text">...</div>
		</div>
		<div id="answer3" class="answer">
			<span class="answer-letter">C - </span>
			<span class="answer-text">...</div>
		</div>
		<div id="answer4" class="answer">
			<span class="answer-letter">D - </span>
			<span class="answer-text">...</div>
		</div>
		`;

        questionNumberHtml = document.getElementById("question-number");
        questionHtml = document.getElementById("question");
        questionInfoHtml = document.getElementById("question-info");

        answersHtml = document.getElementsByClassName("answer");
        answersTextHtml = document.getElementsByClassName("answer-text");
    }

    function displayResults() {
        
    }

    const sock = new WebSocket("ws://" + window.location.host);

    sock.onopen = function() {
        let state = STATE_GAME_INFO;

        let playersCount = 0;
        let minPlayersCount = 0;

        let question;

        let questionNumber = 0;
        let questionCountdown;

        sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            switch (state) {
                case STATE_GAME_INFO:
                    {
                        minPlayersCount = msg[0];
                        minPlayersCountHtml.innerHTML = minPlayersCount;

                        playersCount = msg[1];
                        playersCountHtml.innerHTML = playersCount;

                        state = STATE_WAITING_ROOM;
                        break;
                    }

                case STATE_WAITING_ROOM:
                    {
                        if (msg[0] == ADD_PLAYER) {
                            playersCount++;
                            playersCountHtml.innerHTML = playersCount;
                        } else if (msg[0] == DEL_PLAYER) {
                            playersCount--;
                            playersCountHtml.innerHTML = playersCount;
                        } else if (msg[0] == START_GAME_COUNTDOWN) {
                            let countdownInfoHtml = document.createElement("div");
                            countdownInfoHtml.id = "start-countdown-info";
                            countdownInfoHtml.innerHTML = "La partie commence dans ";

                            let time = msg[1];

                            let countdownHtml = document.createElement("span");
                            countdownHtml.innerHTML = time;

                            countdownInfoHtml.appendChild(countdownHtml);
                            document.body.insertBefore(countdownInfoHtml, playersInfoHtml);

                            let countdown = setInterval(function() {
                                time--;
                                countdownHtml.innerHTML = time;

                                if (time == 0) {
                                    clearInterval(countdown);
                                }
                            }, 1000)
                        } else if (msg[0] == START_GAME) {
                            displayGame();
                            state = STATE_WAIT_QUESTION;
                        }

                        break;
                    }

                case STATE_WAIT_QUESTION:
                    {
                        if(msg[0] == NEW_QUESTION) {
                            clearInterval(questionCountdown);

                            for(let answerHtml of answersHtml) {
                                answerHtml.style.backgroundColor = "";
                            }

                            question = msg[1];

                            questionNumber++;
                            questionNumberHtml.innerHTML = "Question " + questionNumber;

                            questionHtml.innerHTML = question[0];

                            for (let i = 0; i < 4; i++) {
                                answersTextHtml[i].innerHTML = question[1][i];
                            }

                            let time = question[2];

                            questionInfoHtml.innerHTML = "Temps restant : <span id=\"question-countdown\">...</span>";

                            let questionCountdownHtml = document.getElementById("question-countdown");
                            questionCountdownHtml.innerHTML = time;

                            questionCountdown = setInterval(function() {
                                time--;
                                questionCountdownHtml.innerHTML = time;

                                if (time == 0) {
                                    clearInterval(questionCountdown);
                                }
                            }, 1000);

                            state = STATE_ANSWER;
                        } else if(msg[0] == END_GAME) {
                            document.body.innerHTML = `
                            <div id="results-header">Résultats</div>
                            <div id="results"></div>
                            `;

                            let resultsHtml = document.getElementById("results");
                            let scores = msg[1];

                            for(let i = 0; i < scores.length; i++) {
                                resultsHtml.innerHTML += "<div class=\"resultContener\"><span class=\"playerName\">" + scores[i][0] + "</span><span class=\"playerScore\">" + scores[i][1] + "</span></div>";
                            }
                        }

                        break;

                    }

                case STATE_ANSWER:
                    {
                        questionInfoHtml.innerHTML = "La bonne réponse était \"" + question[1][msg[0]] + "\"";

                        for(let answerHtml of answersHtml) {
                            answerHtml.style.backgroundColor = "#bb0b0b";
                        }

                        answersHtml[msg[0]].style.backgroundColor = "#22780f";

                        state = STATE_WAIT_QUESTION;
                        break;
                    }
            }
        }
    }
}
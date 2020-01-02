const CLIENT_TYPE_SCREEN = 1;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const ADD_PLAYER = 0;
const DEL_PLAYER = 2;

const states = {
    GAME_INFO: 0,
    WAITING_ROOM: 1,
    GAME: 2,
}

function displayHome() {
    document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="join-invitation">Rejoignez la partie sur http://` + window.location.host + `/play</div>
	<div id="player-infos">
		<div class="player-info" id="player-info-first">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">0</span></div>
		<div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="min-players">...</span></div>
	</div>
	`;
}

//TODO 
// Envoyer les questions et réponses lors du chargement de la page de question

const questions = {
    Q1: {
        Q: 'Combien y a t-il eu de présidents aux États-Unis ?',
        R1: '12',
        R2: '128',
        R3: '42',
        R4: '45'
    },
    Q2: {
        Q: `En quelle année a eu lieu l'exposition universelle durant laquelle la Tour Eiffel a été construite ?`,
        R1: '1890',
        R2: '1907',
        R3: '2020',
        R4: '1887'
    }
}

function displayGame(nb) {
    let jeu;
    switch (nb) {
        case 1:
            jeu = questions.Q1;
            break;

        case 2:
            jeu = questions.Q2;
            break;

        default:
            break;
    }
    document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="player-infos">
        <label id="answer1">` + jeu.R1 + `</label>
        <span class='progressBar'>
            <div id=graph1>
            </div>
        </span><br>
        <label id="answer2">` + jeu.R2 + `</label>
        <span class='progressBar'>
            <div id=graph2>
            </div>
        </span><br>
        <label id="answer3">` + jeu.R3 + `</label>
        <span class='progressBar'>
            <div id=graph3>
            </div>
        </span><br>
        <label id="answer4">` + jeu.R4 + `</label>
        <span class='progressBar'>
            <div id=graph4>
            </div>
        </span><br>
    </div>
	`;
}

window.onload = function() {
    displayHome();

    const connectedPlayersCountHtml = document.getElementById("connected-players");
    const minPlayersCountHtml = document.getElementById("min-players");

    const sock = new WebSocket("ws://" + window.location.host);

    sock.onopen = function() {
        let state = states.GAME_INFO;

        let playersNumber = 0;
        let minPlayersCount = 0;

        let questionNumber = 1;

        let stats = [0, 0, 0, 0];
        let graph = [];

        let countAnswers = 0;

        sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            console.log(msg);
            switch (state) {
                case states.GAME_INFO:
                    minPlayersCount = msg[0];
                    minPlayersCountHtml.innerHTML = minPlayersCount;


                    connectedPlayersCount = msg[1];
                    connectedPlayersCountHtml.innerHTML = connectedPlayersCount;

                    state = states.WAITING_ROOM;
                    break;

                case states.WAITING_ROOM:
                    if (msg[0] == ADD_PLAYER) {
                        playersNumber++;
                        connectedPlayersCountHtml.innerHTML = playersNumber;

                        if (playersNumber >= minPlayersCount && minPlayersCount != 0) {
                            state = states.GAME;
                            console.log("JEU");
                            displayGame(questionNumber);

                            graph[0] = document.getElementById('graph1');
                            graph[1] = document.getElementById('graph2');
                            graph[2] = document.getElementById('graph3');
                            graph[3] = document.getElementById('graph4');
                        }


                    } else if (msg[0] == DEL_PLAYER) {
                        playersNumber--;
                        connectedPlayersCountHtml.innerHTML = playersNumber;
                    }

                    break;

                    //TODO


                    /**
                     * JSON :
                     * question number
                     * answer number
                     */
                case states.GAME:
                    stats[msg[1]]++;

                    for (let i = 0; i < graph.length; i++) {
                        const element = graph[i];
                        if (stats[i] != 0) {
                            let percent = Math.trunc((stats[i] / playersNumber) * 1000) / 10;
                            element.style.width = percent + "%";
                            element.innerHTML = percent + "%";
                        }
                    }
                    countAnswers++;

                    if (countAnswers == playersNumber) {
                        questionNumber++;

                        displayGame(questionNumber);
                    }

                    break;
            }
        }
    }
}
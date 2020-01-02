const CLIENT_TYPE_SCREEN = 1;

const SECRET_SCREEN_KEY = "7116dd23254dc1a8";

const ADD_PLAYER = 0;
const DEL_PLAYER = 2;

const State = {
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

const Questions = {
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
            jeu = Questions.Q1;
            break;

        case 2:
            jeu = Questions.Q2;
            break;

        default:
            break;
    }
    document.body.innerHTML = `
	<div id="service-name">Piccadilly Game</div>
	<div id="player-infos">
        <button id="answer1">` + jeu.R1 + `</button>
        <button id="answer2">` + jeu.R2 + `</button>
        <button id="answer3">` + jeu.R3 + `</button>
        <button id="answer4">` + jeu.R4 + `</button>
    </div>
	`;
}

window.onload = function() {
    displayHome();

    const connectedPlayersCountHtml = document.getElementById("connected-players");
    const minPlayersCountHtml = document.getElementById("min-players");

    const sock = new WebSocket("ws://" + window.location.host);

    sock.onopen = function() {
        let state = State.GAME_INFO;

        let playersNumber = 0;
        let minPlayersCount = 0;

        let questionNumber = 1;

        let stats = [0, 0, 0, 0];

        sock.send(JSON.stringify([CLIENT_TYPE_SCREEN, SECRET_SCREEN_KEY]));

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            console.log(msg);
            switch (state) {
                case State.GAME_INFO:
                    minPlayersCount = msg[0];
                    minPlayersCountHtml.innerHTML = minPlayersCount;


                    connectedPlayersCount = msg[1];
                    connectedPlayersCountHtml.innerHTML = connectedPlayersCount;

                    state = State.WAITING_ROOM;
                    break;

                case State.WAITING_ROOM:
                    if (msg[0] == ADD_PLAYER) {
                        playersNumber++;
                        connectedPlayersCountHtml.innerHTML = playersNumber;

                        if (playersNumber >= minPlayersCount && minPlayersCount != 0) {
                            state = State.GAME;
                            console.log("JEU");
                            displayGame(questionNumber);
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
                case State.GAME:
                    stats[msg[0]]++;
                    console.log(stats);
                    break;
            }
        }
    }
}
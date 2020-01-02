const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;

const State = {
    NONE: 0,
    GAME_INFO: 1,
    PLAYER_LIST: 2,
    WAITING_ROOM: 3
}


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

function displayHome() {
    document.body.innerHTML = `
	<div id="player-infos">
		<div class="player-info">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">...</span></div>
		<div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="min-players">...</span></div>
	</div>
	<div id="player-pseudo">Votre pseudo est <span id="player-pseudo-value">...</span></div>
	<div id="new-player-form">
		<input type="text" placeholder="Entrez votre pseudo" id="pseudo-input" required autofocus><br>
		<div id="pseudo-error"></div>
		<button id="send-pseudo-button">Envoyer</button>
	</div>
	<div id="player-list-header">Joueurs connectés</div>
	<div id="player-list">

	</div>
	`;
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
	
    <div id="moduleQ">
        <div id="question">` + jeu.Q + `</div><br>
        <div id="time">Temps restant</div>
        <div id="progress">
            <div id="progress2"></div>
        </div>
        <div id="reponses">
            <button id="answer1">` + jeu.R1 + `</button>
            <button id="answer2">` + jeu.R2 + `</button>
            <button id="answer3">` + jeu.R3 + `</button>
            <button id="answer4">` + jeu.R4 + `</button>
        </div>
    </div>

    `;

    answers[0] = document.getElementById("answer1");
    answers[1] = document.getElementById("answer2");
    answers[2] = document.getElementById("answer3");
    answers[3] = document.getElementById("answer4");
}

let answers = [];

window.onload = function() {
    displayHome();

    let questionNumber = 1;

    const connectedPlayersCount = document.getElementById("connected-players");
    const minPlayersCount = document.getElementById("min-players");

    const pseudoInput = document.getElementById("pseudo-input");
    const pseudoError = document.getElementById("pseudo-error");
    const sendPseudoButton = document.getElementById("send-pseudo-button");

    const playerPseudoHtml = document.getElementById("player-pseudo-value");
    const playersHtmlList = document.getElementById("player-list");

    const sock = new WebSocket("ws://" + window.location.host);

    let minPlayer = 0;
    let players;

    sock.onopen = function() {
        let state = State.GAME_INFO;

        let minPlayersCount = 0;

        let meId;

        sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            console.log(msg);

            switch (state) {
                case State.GAME_INFO:
                    players = msg[1];

                    minPlayersCount.innerHTML = msg[0];
                    minPlayer = msg[0];

                    connectedPlayersCount.innerHTML = players.length;

                    meId = msg[2];

                    for (player of players) {
                        player.htmlLine = document.createElement("div");
                        player.htmlLine.classList.add("player-list-player");
                        player.htmlLine.innerHTML = player.pseudo;

                        playersHtmlList.appendChild(player.htmlLine);

                        if (player.id == meId) {
                            playerPseudoHtml.innerHTML = player.pseudo;
                        }
                    }

                    state = State.WAITING_ROOM;
                    break;

                case State.GAME:
                    displayGame(questionNumber);

                    for (let i = 0; i < answers.length; i++) {
                        const reponse = answers[i];
                        reponse.onclick = function() {
                            sock.send(JSON.stringify([questionNumber, i]));

                            questionNumber++;
                            displayGame(questionNumber);

                            /*for (let j = 0; j < answers.length; j++) {
                                const element = answers[j];
                                element.disabled = true;
                                element.classList.add("disable");
                            }*/
                        };
                    }


                    break;

                case State.WAITING_ROOM:
                    if (msg[0] == ADD_PLAYER) {
                        let player = {
                            id: msg[1],
                            pseudo: msg[2]
                        };
                        players.push(player);

                        player.htmlLine = document.createElement("div");
                        player.htmlLine.classList.add("player-list-player");
                        player.htmlLine.innerHTML = player.pseudo;

                        playersHtmlList.appendChild(player.htmlLine);

                        connectedPlayersCount.innerHTML = players.length;

                        conditionJeu();

                    } else if (msg[0] == SET_PSEUDO) {
                        for (player of players) { // on récupère le joueur concerné grâce à son id
                            if (player.id == msg[1]) {
                                player.pseudo = msg[2]; // on change le pseudo du joueur
                                player.htmlLine.innerHTML = player.pseudo; // on met à jour la liste des joueurs HTML

                                if (player.id == meId) {
                                    playerPseudoHtml.innerHTML = player.pseudo;


                                    conditionJeu();
                                }

                                break;
                            }
                        }

                    } else if (msg[0] == DEL_PLAYER) {
                        for (player of players) {
                            if (player.id == msg[1]) {
                                player.htmlLine.remove();
                                players.splice(players.indexOf(player), 1);

                                connectedPlayersCount.innerHTML = players.length;
                            }
                        }
                    } else if (msg[0] == PSEUDO_ALREADY_USED) {
                        pseudoError.innerHTML = "Ce pseudo est déjà utilisé";
                    }

                    break;
            }
        };

        pseudoInput.onfocus = function() {
            pseudoError.innerHTML = "";
        }

        sendPseudoButton.onclick = function() {
            sock.send(JSON.stringify([pseudoInput.value]));
            pseudoError.innerHTML = "";

            conditionJeu();
        };

        function conditionJeu() {
            if (players.length >= minPlayer && minPlayer != 0) {
                state = State.GAME;
                console.log("JEU");
            }
        }
    };

}
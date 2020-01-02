const CLIENT_TYPE_PLAYER = 0;

const ADD_PLAYER = 0;
const SET_PSEUDO = 1;
const DEL_PLAYER = 2;
const PSEUDO_ALREADY_USED = 3;
const START_GAME = 4;

const State = {
    NONE: 0,
    GAME_INFO: 1,
    PLAYER_LIST: 2,
    WAITING_ROOM: 3
}

window.onload = function() {
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

	let connectedPlayersCount = document.getElementById("connected-players");
    let minPlayersCountHtml = document.getElementById("min-players");

    let pseudoInput = document.getElementById("pseudo-input");
    let pseudoError = document.getElementById("pseudo-error");
    let sendPseudoButton = document.getElementById("send-pseudo-button");

    let playerPseudoHtml = document.getElementById("player-pseudo-value");
    let playersHtmlList = document.getElementById("player-list");

    let questionNumberHtml;
    let remainingTimeHtml;

    let sock = new WebSocket("ws://" + window.location.host);

    let minPlayersCount;

    function displayGame() {
		document.body.innerHTML = `
		<div id="question-number">Question 1</div>
		<div id="remaining-time">Temps restant : <span id="remaining-time-value"></span></div>
		<div class="answer-button">
			<div class="answer-letter">A</div>
		</div>
		<div class="answer-button">
			<div class="answer-letter">B</div>
		</div>
		<div class="answer-button">
			<div class="answer-letter">C</div>
		</div>
		<div class="answer-button">
			<div class="answer-letter">D</div>
		</div>
		`;

		questionNumberHtml = document.getElementById("question-number");
		remainingTimeHtml = document.getElementById("remaining-time-value");
	}

    sock.onopen = function() {
        let state = State.GAME_INFO;
        let players;

        let minPlayersCount = 0;

        let meId;

        let questionNumber = 1;

        sock.send(JSON.stringify([CLIENT_TYPE_PLAYER]));

        sock.onmessage = function(json) {
            let msg = JSON.parse(json.data);

            switch (state) {
                case State.GAME_INFO:
                    players = msg[1];

                    minPlayersCount = msg[0];
                    minPlayersCountHtml.innerHTML = minPlayersCount;

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
                    } else if (msg[0] == SET_PSEUDO) {
                        for (player of players) { // on récupère le joueur concerné grâce à son id
                            if (player.id == msg[1]) {
                                player.pseudo = msg[2]; // on change le pseudo du joueur
                                player.htmlLine.innerHTML = player.pseudo; // on met à jour la liste des joueurs HTML

                                if (player.id == meId) {
                                    playerPseudoHtml.innerHTML = player.pseudo;
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
                    } else if (msg[0] == START_GAME) {
                    	displayGame();
                    	state = State.GAME;
                    }

                    break;

                case State.GAME:
                    let count = msg[0];
                    remainingTimeHtml.innerHTML = count;

                    let countDown = setInterval(function() {
                        count--;
                        remainingTimeHtml.innerHTML = count;

                        if(count == 0) {
                            clearTimeout(countDown);
                        }
                    }, 1000);

                	break;
            }
        };

        pseudoInput.onfocus = function() {
            pseudoError.innerHTML = "";
        }

        sendPseudoButton.onclick = function() {
            sock.send(JSON.stringify([pseudoInput.value]));
            pseudoError.innerHTML = "";
        };
    };

}
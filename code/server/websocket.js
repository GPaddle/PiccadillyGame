"use strict";

const fs = require("fs"); // même module que dans main.js
const ws = require("ws"); // bibliothèque websocket (https://github.com/websockets/ws) permettant la communication bidirectionnelle

const CLIENT_TYPE_PLAYER = 0,
	CLIENT_TYPE_SCREEN = 1;

const ADD_PLAYER = 0,
	DEL_PLAYER = 1,
	PSEUDO_OK = 2,
	PSEUDO_ALREADY_USED = 3,
	START_GAME_COUNTDOWN = 4,
	START_GAME = 5;

const STOP_GAME = 0;

const WAIT_NOTHING = 0,
	WAIT_AUTH = 1,
	WAIT_PSEUDO = 2,
	WAIT_REPLAY = 3;

const WAITING_ROOM = 0, // les différents états du jeu. attente de joueurs
	BEGIN_COUNT_DOWN = 1, // compte à rebours avant le début de la partie
	SCORE = 2; // affichage des scores finaux
// toutes les valeurs au dessus de SCORE veulent dire qu'on est en jeu

module.exports = function (httpServer, conf) {
	const wss = new ws.Server({ server: httpServer }); // on crée le serveur websocket par dessus le serveur http déjà existant

	const game = {}; // l'objet game contient les variables et fonctions partagées entre websocket.js et le fichier de jeu (questions.js ou space.js)

	game.playersSocks = []; // tableau de tous les joueurs
	game.waitingRoomSocks = []; // tableau des personnes se trouvant en salle d'attente qui recoivent les évènements de salle d'attente ("bidule s'est connecté", "machin s'est déconnecté")
	game.screensSocks = []; // tableau de tous les écrans d'affichage connectés au serveur

	game.state = WAITING_ROOM; // on initialise l'état du jeu à "salle d'attente"

	game.conf = conf;

	const pseudoPossibilities = JSON.parse(fs.readFileSync("ressources/pseudos.json")); // on charge la liste des templates de pseudos

	let nextPlayerId = 0; // variable contenant le prochain id de joueur à attribuer

	if (conf.testMode) { // changement de configuration si le mode test est activé
		conf.minPlayer = 1;
		conf.startCountdownTime = 1;
	}

	const initGame = require("./" + conf.game + ".js"); // on charge le fichier js correspondant au jeu choisi dans la configuration
	initGame(game); // on remplit l'objet game avec les fonctions propres au jeu choisi

	function startBeginCountdown() { // fonction qui lance le compte à rebours de début de partie
		game.state = BEGIN_COUNT_DOWN; // on passe l'état du jeu sur "compte à rebours"

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify([START_GAME_COUNTDOWN, conf.startCountdownTime, conf.game])); // on dit à tous les écrans que le compte à rebours se lance et la durée de ce décompte
		}

		let beginCountdown = setTimeout(game.start, conf.startCountdownTime * 1000); // on lance la partie à la fin du décompte
	}

	game.stop = function () { // fonction lancée par le module propre au jeu qui termine la partie
		game.state = SCORE; // on passe en mode "score"

		let scores = []; // on crée un tableau vide de score

		for (let i = 0; i < game.playersSocks.length; i++) { // on crée un tableau d'objets {pseudo, score} pour chaque joueur
			scores[i] = {
				"pseudo": game.playersSocks[i].player.pseudo,
				"score": game.playersSocks[i].player.score
			}
		}

		scores.sort(function (a, b) { // on trie les scores par ordre décroissant
			return b.score - a.score;
		})

		let screensSocksScores = [STOP_GAME, game.playersSocks.length]; // on prépare un message à envoyer aux écrans qui va prévenir de la fin de la partie et qui va contenir la liste des scores

		for (let i = 0; i < game.playersSocks.length; i++) { // pour chaque joueur
			game.playersSocks[i].send(JSON.stringify([STOP_GAME, game.playersSocks[i].player.score])); // on envoit au joueur le message de fin de partie avec le score de celui-ci

			game.playersSocks[i].state = WAIT_REPLAY; // on met la socket du joueur en attente d'un message "je veux rejouer"

			screensSocksScores.push(scores[i].pseudo); // on ajoute dans le message destinés aux écrans l'association pseudo-score du joueur
			screensSocksScores.push(scores[i].score);
		}

		for (let screenSock of game.screensSocks) {
			screenSock.send(JSON.stringify(screensSocksScores)); // on envoit les scores aux écrans
		}

		game.playersSocks = []; // on vide la liste de joueurs pour la prochaine partie
		nextPlayerId = 0;

		setTimeout(function () { // on affiche les scores pendant un certain temps (configurable) puis on reprépare une nouvelle partie
			game.state = WAITING_ROOM; // on met l'état du jeu sur "salle d'attente"

			for (let screenSock of game.screensSocks) {
				screenSock.send(JSON.stringify([conf.minPlayer, game.playersSocks.length])); // on envoit les caractéristiques de la partie aux grands écrans
			}

			if (game.playersSocks.length >= conf.minPlayer) { // s'il y a déjà assez de joueurs quand on sort de l'écran d'affichage des scores, on déclenche directement le décompte de début de partie
				startBeginCountdown();
			}
		}, conf.scoreCountdownTime * 1000); // on multiplie par 1000 pour convertir les secondes du fichier de configuration en millisecondes
	}

	wss.on("connection", function (sock) { // quand un client se connecte sur le serveur websocket
		sock.state = WAIT_AUTH; // on met l'état de la socket du client en attente d'authentification (on veut savoir si c'est un joueur ou un grand écran)

		function initPrePlayer() { // quand un joueur entre en salle d'attente (après s'être connecté ou quand il clique sur "rejouer")
			let random1 = Math.floor(Math.random() * (pseudoPossibilities.names.length - 1)); // on tire au hasard la première partie du pseudo proposé au joueur
			let random2 = Math.floor(Math.random() * (pseudoPossibilities.adjectives.length - 1)); // de même pour la 2ème partie

			let pseudoPart1 = pseudoPossibilities.names[random1]; // on récupère la chaîne de caractère de première partie
			let pseudoPart2 = pseudoPossibilities.adjectives[random2]; // de même pour la 2ème partie

			let pseudoSuggestion = `${pseudoPart1} ${pseudoPart2}`; // on génère une proposition de pseudo au joueur qu'il pourra confirmer ou changer

			// format de la trame sérialisée gameInfo : suggestion de pseudo, nombre de joueur, id, "pseudo", id, "pseudo"...

			let gameInfo = [pseudoSuggestion, game.playersSocks.length, conf.testMode]; // on prépare la trame qui va donner les informations de la partie aux joueurs (suggestion proposée au joueur, liste de tous les joueurs déjà connectés, mode test oui ou non)

			for (let i = 0; i < game.playersSocks.length; i++) { // on ajoute chaque joueur dans le liste de joueurs à envoyer au nouveau joueurs
				gameInfo.push(game.playersSocks[i].player.id);
				gameInfo.push(game.playersSocks[i].player.pseudo);
			}

			sock.send(JSON.stringify(gameInfo)); // on envoit les infos au joueur
			game.waitingRoomSocks.push(sock); // on ajoute le nouveau joueur à la salle d'attente

			sock.state = WAIT_PSEUDO; // on se met en attente d'une confirmation par le joueur
		}

		sock.on("message", function (json) { // quand on reçoit un message websocket du joueur
			let msg;

			try {
				msg = JSON.parse(json); // on essaye d'interpréter le json reçu
			} catch (error) {
				return; // si on arrive pas, on abandonne
			}

			switch (sock.state) {

				case WAIT_AUTH: { // quand on est en attente d'authentification
					if (msg[0] == CLIENT_TYPE_PLAYER) {
						initPrePlayer(); // si le client nous dit "je suis un joueur", on prépare ce futur joueur
					} else if (msg[0] == CLIENT_TYPE_SCREEN) {

						//REPERE 10
						sock.send(JSON.stringify([conf.minPlayer, game.playersSocks.length])); // si le client nous dit "je suis un grand écran", on envoit les caractéristiques de la partie à cet écran
						sock.state = WAIT_NOTHING; // on n'attend plus aucune donnée envoyé par l'écran (il ne fait qu'afficher ce qu'on lui envoit)
						game.screensSocks.push(sock); // on ajoute l'écran à la liste des écrans

						if (game.state > SCORE) {

							game.onScreenJoinInGame(sock, game.playersSocks);
						}
					}

					break;
				}

				case WAIT_PSEUDO: { // quand on est en attente d'une confirmation de pseudo de la part du joueur
					let isPseudoFree = true;

					for (let playerSock of game.playersSocks) { // on cherche si le pseudo n'est pas déjà pris par un autre joueur
						if (msg[0] == playerSock.player.pseudo) {
							isPseudoFree = false;
							break;
						}
					}

					if (isPseudoFree) { // si le pseudo est disponible
						sock.isPlayer = true; // permet de préciser que ce client est un joueur

						sock.player = {}; // on initialise tous les attributs propres aux joueurs dans un objet "player" de la socket
						sock.player.id = nextPlayerId;
						sock.player.pseudo = msg[0];
						sock.player.score = 0;

						nextPlayerId++; // on incrémente le prochain id attribué

						game.playersSocks.push(sock); // on ajoute le joueur à la liste des joueurs

						sock.send(JSON.stringify([PSEUDO_OK, sock.player.id])); // on dit au joueur que son pseudo a été accepté et on lui donne son id de joueur

						if (game.state == WAITING_ROOM || game.state == BEGIN_COUNT_DOWN) {
							for (let screenSock of game.screensSocks) {
								screenSock.send(JSON.stringify([ADD_PLAYER])); // si le jeu est en mode salle d'attente ou en mode compte à rebours, on informe tous les grands écrans qu'un joueur a rejoint la partie
							}
						}

						for (let waitingRoomSock of game.waitingRoomSocks) {
							if (waitingRoomSock != sock) {
								waitingRoomSock.send(JSON.stringify([ADD_PLAYER, sock.player.id, sock.player.pseudo])); // on informe tous les joueurs en salle d'attente qu'un joueur a rejoint la partie
							}
						}

						if (game.state == WAITING_ROOM && game.playersSocks.length >= conf.minPlayer) {
							startBeginCountdown(); // si on est en mode "salle d'attente" et que assez de joueurs sont connectés, on lance le compte à rebours de début de partie
						} else if (game.state > SCORE) {
							game.onPlayerJoinInGame(sock); // si le joueur rejoint alors qu'on est en pleine partie, on laisse le fichier propre au jeu gérer ce cas
						}
					} else {
						sock.send(JSON.stringify([PSEUDO_ALREADY_USED])); // si le pseudo est déjà pris, on en informe le joueur
					}

					break;
				}

				case WAIT_REPLAY: { // quand on attend si le joueur veut rejouer ou pas
					if (msg.length == 3) { // pour éviter de confondre le message "je veux rejouer" avec un message de la partie en cours (surtout valable pour le jeu space)
						initPrePlayer(); // si le joueur veut rejouer, on relance la fonction d'initialisation
					}

					break;
				}

				default: { // si on est pas dans un état connu, on laisse le jeu gérer le message					
					game.onMessage(sock, msg); // on déclenche l'évènement onMessage du jeu actuel (nouvelle réponse, mouvement du space du joueur...)
					break;
				}
			}
		});

		sock.on("close", function () { // quand un client se déconnecte
			let screensSocksIndex = game.screensSocks.indexOf(sock); // on regarde si il appartient à la liste des grands écrans

			if (screensSocksIndex != -1) {
				game.screensSocks.splice(screensSocksIndex, 1); // s'il appartient à la liste des grands écrans, on le supprime de celle-ci
			}

			let playersSocksIndex = game.playersSocks.indexOf(sock); // on regarde si il appartient à la liste des joueurs

			if (playersSocksIndex != -1) {
				game.playersSocks.splice(playersSocksIndex, 1); // s'il appartient à la liste des grands écrans, on le supprime de celle-ci

				if (game.state == WAITING_ROOM || game.state == BEGIN_COUNT_DOWN) {
					for (let screenSock of game.screensSocks) {
						screenSock.send(JSON.stringify([DEL_PLAYER])); // si on est en mode "salle d'attente" ou "décompte avant partie", on informe tous les grands écrans de la déconnexion d'un joueur
					}
				}

				if (game.state > SCORE) { // supérieur à score donc c'est qu'on est en pleine partie
					game.onPlayerLeftInGame(sock); // si on est pleine partie, on laisse le jeu en cours gérer la déconnexion
				}

				for (let waitingRoomSock of game.waitingRoomSocks) {
					waitingRoomSock.send(JSON.stringify([DEL_PLAYER, sock.player.id])); // on informe tous les joueurs en salle d'attente que le joueur avec tel id s'est déconnecté
				}
			}

			let waitingRoomSocksIndex = game.waitingRoomSocks.indexOf(sock); // on regarde si le client appartient à la liste des joueurs en salle d'attente

			if (waitingRoomSocksIndex != -1) {
				game.waitingRoomSocks.splice(waitingRoomSocksIndex, 1); // s'il appartient à cette liste, on le supprime de celle-ci
			}
		});
	});
}
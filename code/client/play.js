window.onload = function() {
	displayHome();
}

function displayHome() {
	document.body.innerHTML = `
	<div id="player-infos">
		<div class="player-info">Nombre de joueurs connectés : <span class="player-info-value" id="connected-players">...</span></div>
		<div class="player-info">Nombre de joueurs minimum nécessaires : <span class="player-info-value" id="remaining-players">...</span></div>
	</div>
	<form id="new-player-form">
		<input type="text" placeholder="Entrez votre pseudo" id="pseudo-input" required autofocus><br>
		<button id="send-pseudo-button">Envoyer</button>
	</form>
	<div id="player-list">
	
	</div>
	`;
}
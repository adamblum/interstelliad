// WebSocket helper functions
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Get CSRF token on page load
const csrftoken = getCookie('csrftoken');

function connectWebSocket(roomCode) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/game/${roomCode}/`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function(e) {
        console.log('WebSocket connected');
        log('Connected to game room');
    };
    
    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        handleWebSocketMessage(data);
    };
    
    socket.onclose = function(e) {
        console.log('WebSocket closed');
        log('Disconnected from game room');
    };
    
    socket.onerror = function(e) {
        console.error('WebSocket error:', e);
        log('Connection error');
    };
}

function handleWebSocketMessage(data) {
    const type = data.type;
    
    if (type === 'player_joined') {
        handlePlayerJoined(data);
    } else if (type === 'game_started') {
        handleGameStarted(data);
    } else if (type === 'player_moved') {
        handlePlayerMoved(data);
    } else if (type === 'life_checked') {
        handleLifeChecked(data);
    } else if (type === 'planet_colonized') {
        handlePlanetColonized(data);
    } else if (type === 'battle_result') {
        handleBattleResult(data);
    } else if (type === 'turn_ended') {
        handleTurnEnded(data);
    }
}

function sendWebSocketMessage(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

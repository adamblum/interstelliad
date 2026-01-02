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
    // Don't connect if already connected
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('[WS] Already connected to WebSocket');
        return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/game/${roomCode}/`;
    
    console.log('[WS] Connecting to:', wsUrl);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function(e) {
        console.log('[WS] WebSocket connected');
        log('Connected to game room');
    };
    
    socket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('[WS] Message received:', data);
        handleWebSocketMessage(data);
    };
    
    socket.onclose = function(e) {
        console.log('[WS] WebSocket closed');
        log('Disconnected from game room');
    };
    
    socket.onerror = function(e) {
        console.error('[WS] WebSocket error:', e);
        log('Connection error');
    };
}

function handleWebSocketMessage(data) {
    const type = data.type;
    
    if (type === 'player_joined') {
        handlePlayerJoined(data);
    } else if (type === 'game_started') {
        handleGameStarted(data);
    } else if (type === 'turn_order_roll') {
        handleTurnOrderRoll(data);
    } else if (type === 'cities_loaded') {
        handleCitiesLoaded(data);
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

function handleTurnOrderRoll(data) {
    const playerIndex = data.player_index;
    const roll = data.roll;
    
    gameState.turnOrderRolls[playerIndex] = roll;
    
    // Track the order in which players roll (for tiebreaker - first roller wins ties)
    if (!gameState.rollOrder.includes(playerIndex)) {
        gameState.rollOrder.push(playerIndex);
    }
    
    const playerName = gameState.players[playerIndex].name;
    log(`${playerName} rolled a ${roll} for turn order.`);
    
    checkTurnOrderComplete();
}

function handleCitiesLoaded(data) {
    const playerIndex = data.player_index;
    const cities = data.cities;
    const velocity = 9 - cities;
    
    const player = gameState.players[playerIndex];
    if (player) {
        player.citiesOnShip = cities;
        player.velocity = velocity;
        player.hasLoadedCities = true;
        
        log(`${player.name} loaded ${cities} ${cities === 1 ? 'city' : 'cities'}. Velocity: ${velocity} light years/turn.`);
    }
}

function handleTurnEnded(data) {
    const nextPlayerIndex = data.next_player_index;
    
    // Update the current player index
    gameState.currentPlayerIndex = nextPlayerIndex;
    gameState.turnPhase = 'planning';
    gameState.movementPath = [];
    gameState.remainingMoves = 0;
    
    const nextPlayer = gameState.players[nextPlayerIndex];
    log(`${nextPlayer.name}'s turn`);
    
    // Update UI based on whether it's my turn
    const moveBtn = document.getElementById('moveBtn');
    const movementControls = document.getElementById('movementControls');
    
    if (moveBtn) {
        moveBtn.style.display = 'block';
        if (myPlayerIndex === nextPlayerIndex) {
            moveBtn.disabled = false;
            moveBtn.style.opacity = '1';
        } else {
            moveBtn.disabled = true;
            moveBtn.style.opacity = '0.5';
        }
    }
    if (movementControls) {
        movementControls.style.display = 'none';
    }
    
    drawBoard();
    updateUI();
}

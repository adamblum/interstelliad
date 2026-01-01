// WebSocket connection
let socket = null;
let roomCode = null;
let myPlayerIndex = null;

// Game State
const gameState = {
    players: [],
    currentPlayerIndex: 0,
    board: null,
    gameStarted: false,
    selectedHex: null,
    turnPhase: 'move', // 'move', 'checkLife', 'colonize', 'battle'
    movesThisTurn: 0,
    maxMovesPerTurn: 3,
    hasColonizedThisTurn: false,
    isOrganizer: false,
    maxPlayers: 2,
    joinedPlayers: [],
    currentPlayerName: null,
    currentPlayerPlanet: null
};

// Player colors
const PLAYER_COLORS = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];

// Home planets and their starting positions
const HOME_PLANETS = {
    'Earth': { q: 0, r: 0, emoji: '🌍', planetIndex: 0 },
    'Mars': { q: 0, r: 0, emoji: '🔴', planetIndex: 1 },
    'Belt': { q: 0, r: 0, emoji: '☄️', planetIndex: 2 },
    'Jupiter': { q: 1, r: -1, emoji: '🪐', planetIndex: 0 }
};

// Canvas and context
let canvas, ctx;

// Hex grid configuration
const HEX_RADIUS = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;

// Board structure: Star systems with planets
const BOARD_STRUCTURE = [
    // Center star systems - Sol (with Earth, Mars, Belt)
    { q: 0, r: 0, name: 'Sol', planets: 3, color: '#ffeb3b', planetNames: ['Earth', 'Mars', 'Belt'] },
    { q: 1, r: -1, name: 'Alpha Centauri', planets: 2, color: '#ff9800', planetNames: ['Jupiter', 'AC-b'] },
    { q: 1, r: 0, name: 'Sirius', planets: 4, color: '#2196f3' },
    { q: 0, r: 1, name: 'Betelgeuse', planets: 3, color: '#f44336' },
    { q: -1, r: 1, name: 'Vega', planets: 2, color: '#e1f5fe' },
    { q: -1, r: 0, name: 'Proxima', planets: 3, color: '#ff5722' },
    { q: 2, r: -2, name: 'Polaris', planets: 2, color: '#9c27b0' },
    { q: 2, r: -1, name: 'Rigel', planets: 3, color: '#03a9f4' },
    { q: 2, r: 0, name: 'Antares', planets: 2, color: '#e91e63' },
    { q: 1, r: 1, name: 'Aldebaran', planets: 3, color: '#ff6b35' },
    { q: 0, r: 2, name: 'Arcturus', planets: 2, color: '#ffc107' },
    { q: -1, r: 2, name: 'Spica', planets: 3, color: '#00bcd4' },
    { q: -2, r: 2, name: 'Regulus', planets: 2, color: '#ffeb3b' },
    { q: -2, r: 1, name: 'Deneb', planets: 3, color: '#8bc34a' },
    { q: -2, r: 0, name: 'Altair', planets: 2, color: '#cddc39' },
    { q: -1, r: -1, name: 'Fomalhaut', planets: 3, color: '#00acc1' },
    { q: 0, r: -1, name: 'Procyon', planets: 2, color: '#ffb74d' },
    { q: 1, r: -2, name: 'Canopus', planets: 3, color: '#fff9c4' }
];

// Initialize canvas
function initCanvas() {
    canvas = document.getElementById('gameBoard');
    ctx = canvas.getContext('2d');
    
    canvas.addEventListener('click', handleCanvasClick);
}

// Hex coordinate to pixel conversion
function hexToPixel(q, r) {
    const x = HEX_RADIUS * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r) + canvas.width / 2;
    const y = HEX_RADIUS * (3/2 * r) + canvas.height / 2;
    return { x, y };
}

// Pixel to hex coordinate conversion
function pixelToHex(x, y) {
    const relX = x - canvas.width / 2;
    const relY = y - canvas.height / 2;
    
    const q = (Math.sqrt(3)/3 * relX - 1/3 * relY) / HEX_RADIUS;
    const r = (2/3 * relY) / HEX_RADIUS;
    
    return axialRound(q, r);
}

function axialRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    
    const q_diff = Math.abs(rq - q);
    const r_diff = Math.abs(rr - r);
    const s_diff = Math.abs(rs - s);
    
    if (q_diff > r_diff && q_diff > s_diff) {
        rq = -rr - rs;
    } else if (r_diff > s_diff) {
        rr = -rq - rs;
    }
    
    return { q: rq, r: rr };
}

// Draw a hexagon
function drawHex(x, y, radius, fillColor, strokeColor = '#ffffff') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const hx = x + radius * Math.cos(angle);
        const hy = y + radius * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(hx, hy);
        } else {
            ctx.lineTo(hx, hy);
        }
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw the board
function drawBoard() {
    // Clear canvas with space background
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars in background
    drawStars();
    
    // Draw hexes for each star system
    BOARD_STRUCTURE.forEach(system => {
        const pos = hexToPixel(system.q, system.r);
        
        // Check if hex is selected
        const isSelected = gameState.selectedHex && 
                          gameState.selectedHex.q === system.q && 
                          gameState.selectedHex.r === system.r;
        
        // Check if player is here
        const playerHere = gameState.players.find(p => p.position.q === system.q && p.position.r === system.r);
        
        const strokeColor = isSelected ? '#00ff00' : (playerHere ? '#ffff00' : '#ffffff');
        
        drawHex(pos.x, pos.y, HEX_RADIUS, system.color + '33', strokeColor);
        
        // Draw star
        drawStar(pos.x, pos.y, 8, system.color);
        
        // Draw system name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(system.name, pos.x, pos.y - 20);
        
        // Draw planets
        const planetRadius = 6;
        const orbitRadius = 25;
        for (let i = 0; i < system.planets; i++) {
            const angle = (Math.PI * 2 / system.planets) * i;
            const px = pos.x + orbitRadius * Math.cos(angle);
            const py = pos.y + orbitRadius * Math.sin(angle);
            
            // Check if planet is colonized
            const colony = system.colonies && system.colonies[i];
            const planetColor = colony ? PLAYER_COLORS[colony.playerId] : '#888888';
            
            ctx.beginPath();
            ctx.arc(px, py, planetRadius, 0, Math.PI * 2);
            ctx.fillStyle = planetColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw home planet indicator
            if (colony && colony.isHome) {
                const player = gameState.players.find(p => p.id === colony.playerId);
                if (player) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(HOME_PLANETS[player.planet].emoji, px, py + 3);
                }
            }
            // Draw alien indicator if planet has life (and not home)
            else if (colony && colony.hadLife) {
                ctx.fillStyle = '#ff00ff';
                ctx.font = 'bold 10px Arial';
                ctx.fillText('👾', px, py + 3);
            }
        }
        
        // Draw player ships
        if (playerHere) {
            const shipX = pos.x;
            const shipY = pos.y + 15;
            ctx.fillStyle = PLAYER_COLORS[playerHere.id];
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🚀', shipX, shipY);
        }
    });
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawStar(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Star glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, color + 'aa');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fill();
}

// Initialize game
function initGame() {
    console.log('[INIT] Initializing game...');
    initCanvas();
    drawBoard();
    
    // Role selection
    const joinGameBtn = document.getElementById('joinGameBtn');
    const createGameBtn = document.getElementById('createGameBtn');
    
    console.log('[INIT] Join Game button:', joinGameBtn);
    console.log('[INIT] Create Game button:', createGameBtn);
    
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            console.log('[INIT] Join Game button clicked!');
            showPlayerLogin();
        });
    } else {
        console.error('[INIT] Join Game button not found!');
    }
    
    if (createGameBtn) {
        createGameBtn.addEventListener('click', () => {
            console.log('[INIT] Create Game button clicked!');
            showOrganizerSetup();
        });
    } else {
        console.error('[INIT] Create Game button not found!');
    }
    
    // Organizer controls
    document.getElementById('createGame').addEventListener('click', createGame);
    document.getElementById('startGame').addEventListener('click', startGame);
    
    // Player controls
    document.getElementById('backToMenu').addEventListener('click', showRoleSelection);
    document.getElementById('joinGame').addEventListener('click', joinGameAsPlayer);
    
    // Planet selection
    document.querySelectorAll('.planet-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.planet-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            gameState.currentPlayerPlanet = this.dataset.planet;
            
            const playerName = document.getElementById('playerName').value.trim();
            document.getElementById('joinGame').disabled = !playerName;
        });
    });
    
    document.getElementById('playerName').addEventListener('input', function() {
        const playerName = this.value.trim();
        const hasPlanet = gameState.currentPlayerPlanet !== null;
        document.getElementById('joinGame').disabled = !playerName || !hasPlanet;
    });
    
    // Game controls
    document.getElementById('moveBtn').addEventListener('click', handleMove);
    document.getElementById('checkLifeBtn').addEventListener('click', checkForLife);
    document.getElementById('colonizeBtn').addEventListener('click', colonizePlanet);
    document.getElementById('endTurnBtn').addEventListener('click', endTurn);
    document.getElementById('rollBattleBtn').addEventListener('click', rollBattle);
    document.getElementById('closeBattleBtn').addEventListener('click', closeBattle);
    document.getElementById('newGameBtn').addEventListener('click', resetGame);
}

function showRoleSelection() {
    document.getElementById('roleSelection').style.display = 'block';
    document.getElementById('organizerSetup').style.display = 'none';
    document.getElementById('playerJoin').style.display = 'none';
    document.getElementById('playerLogin').style.display = 'none';
}

function showOrganizerSetup() {
    gameState.isOrganizer = true;
    document.getElementById('roleSelection').style.display = 'none';
    document.getElementById('organizerSetup').style.display = 'block';
}

function showPlayerLogin() {
    console.log('[SHOW_PLAYER_LOGIN] Showing player login screen');
    gameState.isOrganizer = false;
    document.getElementById('roleSelection').style.display = 'none';
    document.getElementById('playerLogin').style.display = 'block';
    console.log('[SHOW_PLAYER_LOGIN] Player login screen should now be visible');
}

function createGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    gameState.maxPlayers = playerCount;
    gameState.isOrganizer = true;
    
    // Get CSRF token
    const csrftoken = getCookie('csrftoken');
    
    // Call Django backend to create room
    fetch('/create-room/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrftoken
        },
        body: `max_players=${playerCount}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            roomCode = data.room_code;
            document.getElementById('organizerSetup').style.display = 'none';
            document.getElementById('playerJoin').style.display = 'block';
            document.getElementById('roomCodeDisplay').style.display = 'block';
            document.getElementById('roomCodeText').textContent = roomCode;
            
            // Connect to WebSocket
            connectWebSocket(roomCode);
            
            // Poll for room status
            pollRoomStatus();
            
            log(`Game created! Room code: ${roomCode}`);
        } else {
            alert('Error creating game: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to create game');
    });
}

function joinGameAsPlayer() {
    const roomCodeInput = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    const playerName = document.getElementById('playerName').value.trim();
    const planet = gameState.currentPlayerPlanet;
    
    if (!roomCodeInput) {
        alert('Please enter a room code!');
        return;
    }
    
    if (!playerName || !planet) {
        alert('Please enter your name and select a home planet!');
        return;
    }
    
    // Get CSRF token
    const csrftoken = getCookie('csrftoken');
    
    console.log('[JOIN] Attempting to join room:', roomCodeInput, 'as', playerName, planet);
    
    // Call Django backend to join room
    fetch('/join-room/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrftoken
        },
        body: `room_code=${roomCodeInput}&player_name=${playerName}&home_planet=${planet}`
    })
    .then(response => response.json())
    .then(data => {
        console.log('[JOIN] Join response:', data);
        if (data.success) {
            roomCode = data.room_code;
            myPlayerIndex = data.player_index;
            gameState.currentPlayerName = playerName;
            gameState.currentPlayerPlanet = planet;
            
            console.log('[JOIN] Joined successfully. Player index:', myPlayerIndex, 'Player count:', data.player_count);
            
            document.getElementById('playerLogin').style.display = 'none';
            document.getElementById('playerJoin').style.display = 'block';
            document.getElementById('roomCodeDisplay').style.display = 'block';
            document.getElementById('roomCodeText').textContent = roomCode;
            
            // Connect to WebSocket
            connectWebSocket(roomCode);
            
            // Notify other players
            sendWebSocketMessage({
                type: 'player_join',
                player_name: playerName,
                home_planet: planet,
                player_index: myPlayerIndex,
                color: PLAYER_COLORS[myPlayerIndex]
            });
            
            // If game auto-started (2+ players), trigger game start
            if (data.auto_start) {
                console.log('[JOIN] Game auto-starting!');
                setTimeout(() => {
                    startGameFromLobby();
                }, 1000);
            } else {
                // Poll for room status
                pollRoomStatus();
            }
            
            log(`Joined game! Your home planet is ${planet}`);
        } else {
            alert('Error joining game: ' + data.error);
        }
    })
    .catch(error => {
        console.error('[JOIN] Error:', error);
        alert('Failed to join game');
    });
}

function pollRoomStatus() {
    const interval = setInterval(() => {
        fetch(`/room/${roomCode}/status/`)
            .then(response => response.json())
            .then(data => {
                console.log('[POLL] Room status:', data);
                if (data.success) {
                    gameState.joinedPlayers = data.players;
                    updateJoinedPlayersList();
                    
                    if (gameState.isOrganizer && data.can_start && !data.started) {
                        document.getElementById('startGame').style.display = 'block';
                    }
                    
                    // If game has started, trigger game start for all players
                    if (data.started) {
                        console.log('[POLL] Game has started! Triggering game start...');
                        clearInterval(interval);
                        startGameFromLobby();
                    }
                }
            })
            .catch(error => console.error('[POLL] Error polling room:', error));
    }, 2000);
}

function updateJoinedPlayersList() {
    const container = document.getElementById('joinedPlayers');
    container.innerHTML = '';
    
    if (gameState.joinedPlayers.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">No players yet...</p>';
        return;
    }
    
    gameState.joinedPlayers.forEach(player => {
        const div = document.createElement('div');
        div.className = 'joined-player';
        div.style.borderColor = player.color;
        div.innerHTML = `
            <span class="player-planet">${HOME_PLANETS[player.planet].emoji}</span>
            <div>
                <strong>${player.name}</strong>
                <div style="font-size: 0.85em; color: #a0a0ff;">${player.planet}</div>
            </div>
        `;
        container.appendChild(div);
    });
    
    const remaining = gameState.maxPlayers - gameState.joinedPlayers.length;
    if (remaining > 0) {
        const waiting = document.createElement('p');
        waiting.style.cssText = 'text-align: center; margin-top: 10px; color: #00d4ff;';
        waiting.textContent = `Waiting for ${remaining} more player${remaining > 1 ? 's' : ''}...`;
        container.appendChild(waiting);
    }
}

function startGameFromLobby() {
    console.log('[START_GAME_FROM_LOBBY] Initializing game...');
    console.log('[START_GAME_FROM_LOBBY] Joined players:', gameState.joinedPlayers);
    
    // Initialize players from room status
    fetch(`/room/${roomCode}/status/`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.started) {
                console.log('[START_GAME_FROM_LOBBY] Room data:', data);
                
                // Initialize players from joined list
                gameState.players = data.players.map(jp => {
                    const homePlanet = HOME_PLANETS[jp.home_planet];
                    return {
                        id: jp.player_index,
                        name: jp.name,
                        planet: jp.home_planet,
                        color: PLAYER_COLORS[jp.player_index],
                        position: { q: homePlanet.q, r: homePlanet.r },
                        colonies: 0,
                        maxColonies: 10,
                        score: 0
                    };
                });
                
                console.log('[START_GAME_FROM_LOBBY] Players initialized:', gameState.players);
                
                // Initialize board
                initializeBoard();
                
                // Notify all players via WebSocket
                sendWebSocketMessage({
                    type: 'start_game',
                    players: gameState.players,
                    board_state: BOARD_STRUCTURE
                });
                
                // Start game locally
                actuallyStartGame();
            }
        })
        .catch(error => {
            console.error('[START_GAME_FROM_LOBBY] Error:', error);
        });
}

function startGame() {
    if (!gameState.isOrganizer) {
        alert('Only the organizer can start the game!');
        return;
    }
    
    if (gameState.joinedPlayers.length < gameState.maxPlayers) {
        alert('Waiting for all players to join!');
        return;
    }
    
    // Get CSRF token
    const csrftoken = getCookie('csrftoken');
    
    // Call backend to start game
    fetch(`/room/${roomCode}/start/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrftoken
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Initialize players from joined list
            gameState.players = gameState.joinedPlayers.map(jp => {
                const homePlanet = HOME_PLANETS[jp.home_planet];
                return {
                    id: jp.player_index,
                    name: jp.name,
                    planet: jp.home_planet,
                    color: PLAYER_COLORS[jp.player_index],
                    position: { q: homePlanet.q, r: homePlanet.r },
                    colonies: 0,
                    maxColonies: 10,
                    score: 0
                };
            });
            
            // Initialize board
            initializeBoard();
            
            // Notify all players via WebSocket
            sendWebSocketMessage({
                type: 'start_game',
                players: gameState.players,
                board_state: BOARD_STRUCTURE
            });
            
            // Start game locally
            actuallyStartGame();
        }
    });
}

function initializeBoard() {
    // Initialize board with empty colonies
    BOARD_STRUCTURE.forEach(system => {
        system.colonies = new Array(system.planets).fill(null);
    });
    
    // Pre-colonize home planets
    gameState.players.forEach(player => {
        const homePlanet = HOME_PLANETS[player.planet];
        const system = BOARD_STRUCTURE.find(s => s.q === homePlanet.q && s.r === homePlanet.r);
        if (system) {
            system.colonies[homePlanet.planetIndex] = {
                playerId: player.id,
                hadLife: false,
                isHome: true
            };
            player.colonies++; // Count home colony
        }
    });
}

function actuallyStartGame() {
    gameState.gameStarted = true;
    gameState.currentPlayerIndex = 0;
    
    document.getElementById('gameSetup').style.display = 'none';
    document.getElementById('gameInfo').style.display = 'block';
    document.getElementById('roomCodeDisplay').style.display = 'none';
    
    updateUI();
    drawBoard();
    log('Game started! ' + gameState.players[0].name + ' goes first.');
}

function handleCanvasClick(event) {
    if (!gameState.gameStarted) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const hex = pixelToHex(x, y);
    
    // Check if this is a valid hex
    const system = BOARD_STRUCTURE.find(s => s.q === hex.q && s.r === hex.r);
    if (system) {
        gameState.selectedHex = hex;
        drawBoard();
        updateUI();
    }
}

function handleMove() {
    if (!gameState.selectedHex) {
        log('Select a destination star system first!');
        return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const targetSystem = BOARD_STRUCTURE.find(s => 
        s.q === gameState.selectedHex.q && s.r === gameState.selectedHex.r
    );
    
    if (!targetSystem) return;
    
    // Check if adjacent
    const distance = Math.max(
        Math.abs(currentPlayer.position.q - targetSystem.q),
        Math.abs(currentPlayer.position.r - targetSystem.r),
        Math.abs((-currentPlayer.position.q - currentPlayer.position.r) - (-targetSystem.q - targetSystem.r))
    );
    
    if (distance !== 1) {
        log('You can only move to adjacent star systems!');
        return;
    }
    
    if (gameState.movesThisTurn >= gameState.maxMovesPerTurn) {
        log('You have used all your moves this turn!');
        return;
    }
    
    // Move player
    currentPlayer.position = { q: targetSystem.q, r: targetSystem.r };
    gameState.movesThisTurn++;
    
    log(`${currentPlayer.name} moved to ${targetSystem.name}`);
    
    // Enable life check button
    document.getElementById('checkLifeBtn').disabled = false;
    
    drawBoard();
    updateUI();
}

function checkForLife() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentSystem = BOARD_STRUCTURE.find(s => 
        s.q === currentPlayer.position.q && s.r === currentPlayer.position.r
    );
    
    if (!currentSystem) return;
    
    // Roll dice
    const die1 = rollDie();
    const die2 = rollDie();
    const total = die1 + die2;
    
    document.getElementById('die1').textContent = die1;
    document.getElementById('die2').textContent = die2;
    
    // Check for life (7 or higher indicates intelligent life)
    const hasLife = total >= 7;
    
    if (hasLife) {
        document.getElementById('diceResult').textContent = `Life detected! (${total})`;
        log(`${currentPlayer.name} found intelligent life on a planet! Must battle aliens.`);
        gameState.currentPlanetHasLife = true;
    } else {
        document.getElementById('diceResult').textContent = `No life (${total})`;
        log(`${currentPlayer.name} found a dead planet.`);
        gameState.currentPlanetHasLife = false;
    }
    
    // Enable colonize button
    document.getElementById('colonizeBtn').disabled = false;
    document.getElementById('checkLifeBtn').disabled = true;
}

function colonizePlanet() {
    if (gameState.hasColonizedThisTurn) {
        log('You can only colonize one planet per turn!');
        return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer.colonies >= currentPlayer.maxColonies) {
        log('You have no more colony ships!');
        endGame();
        return;
    }
    
    const currentSystem = BOARD_STRUCTURE.find(s => 
        s.q === currentPlayer.position.q && s.r === currentPlayer.position.r
    );
    
    if (!currentSystem) return;
    
    // Find empty planet
    const emptyPlanetIndex = currentSystem.colonies.findIndex(c => c === null);
    if (emptyPlanetIndex === -1) {
        log('No empty planets in this system!');
        return;
    }
    
    if (gameState.currentPlanetHasLife) {
        // Battle aliens
        startBattle('aliens', currentSystem, emptyPlanetIndex);
    } else {
        // Colonize directly
        placeColony(currentSystem, emptyPlanetIndex, false);
    }
}

function startBattle(opponent, system, planetIndex) {
    gameState.battleState = {
        opponent: opponent,
        system: system,
        planetIndex: planetIndex,
        playerRolled: false
    };
    
    document.getElementById('battleTitle').textContent = 
        opponent === 'aliens' ? 'Battle Aliens!' : 'Battle Enemy Colony!';
    document.getElementById('battleDescription').textContent = 
        `You must defeat the ${opponent} to colonize this planet!`;
    document.getElementById('attackerName').textContent = gameState.players[gameState.currentPlayerIndex].name;
    document.getElementById('defenderName').textContent = opponent === 'aliens' ? 'Aliens' : 'Defender';
    document.getElementById('battleResult').textContent = '';
    document.getElementById('rollBattleBtn').style.display = 'block';
    document.getElementById('closeBattleBtn').style.display = 'none';
    
    document.getElementById('battleModal').style.display = 'block';
}

function rollBattle() {
    if (gameState.battleState.playerRolled) return;
    
    // Player rolls
    const playerDie1 = rollDie();
    const playerDie2 = rollDie();
    const playerTotal = playerDie1 + playerDie2;
    
    // Opponent rolls
    const opponentDie1 = rollDie();
    const opponentDie2 = rollDie();
    const opponentTotal = opponentDie1 + opponentDie2;
    
    document.getElementById('attackerDie1').textContent = playerDie1;
    document.getElementById('attackerDie2').textContent = playerDie2;
    document.getElementById('attackerTotal').textContent = playerTotal;
    
    document.getElementById('defenderDie1').textContent = opponentDie1;
    document.getElementById('defenderDie2').textContent = opponentDie2;
    document.getElementById('defenderTotal').textContent = opponentTotal;
    
    gameState.battleState.playerRolled = true;
    
    // Determine winner
    let result;
    if (playerTotal > opponentTotal) {
        result = '🎉 You win! Planet colonized!';
        placeColony(gameState.battleState.system, gameState.battleState.planetIndex, true);
    } else if (playerTotal < opponentTotal) {
        result = '😞 You lost! Cannot colonize.';
        log(`${gameState.players[gameState.currentPlayerIndex].name} lost the battle.`);
    } else {
        result = '🤝 Tie! Roll again.';
        gameState.battleState.playerRolled = false;
        return;
    }
    
    document.getElementById('battleResult').textContent = result;
    document.getElementById('rollBattleBtn').style.display = 'none';
    document.getElementById('closeBattleBtn').style.display = 'block';
}

function closeBattle() {
    document.getElementById('battleModal').style.display = 'none';
    drawBoard();
    updateUI();
}

function placeColony(system, planetIndex, hadLife) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    system.colonies[planetIndex] = {
        playerId: currentPlayer.id,
        hadLife: hadLife
    };
    
    currentPlayer.colonies++;
    gameState.hasColonizedThisTurn = true;
    
    log(`${currentPlayer.name} colonized a ${hadLife ? 'inhabited' : 'dead'} planet in ${system.name}!`);
    
    document.getElementById('colonizeBtn').disabled = true;
    
    // Check if game should end
    if (currentPlayer.colonies >= currentPlayer.maxColonies) {
        setTimeout(() => endGame(), 1000);
    }
    
    drawBoard();
    updateUI();
}

function endTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.movesThisTurn = 0;
    gameState.hasColonizedThisTurn = false;
    gameState.currentPlanetHasLife = false;
    gameState.selectedHex = null;
    
    document.getElementById('checkLifeBtn').disabled = true;
    document.getElementById('colonizeBtn').disabled = true;
    document.getElementById('diceResult').textContent = '';
    document.getElementById('die1').textContent = '?';
    document.getElementById('die2').textContent = '?';
    
    log(`${gameState.players[gameState.currentPlayerIndex].name}'s turn`);
    
    drawBoard();
    updateUI();
}

function endGame() {
    // Calculate scores
    BOARD_STRUCTURE.forEach(system => {
        system.colonies.forEach(colony => {
            if (colony) {
                const player = gameState.players[colony.playerId];
                player.score += colony.hadLife ? 2 : 1;
            }
        });
    });
    
    // Sort players by score
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    // Display results
    const finalScores = document.getElementById('finalScores');
    finalScores.innerHTML = '';
    
    sortedPlayers.forEach((player, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item' + (index === 0 ? ' winner' : '');
        scoreItem.innerHTML = `
            ${index === 0 ? '<span class="winner-crown">👑</span>' : ''}
            <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="player-color" style="background-color: ${player.color}"></div>
                    <strong>${player.name}</strong>
                </div>
                <div style="font-size: 0.9em; color: #a0a0ff;">
                    ${player.colonies} colonies
                </div>
            </div>
            <div style="font-size: 1.5em; font-weight: bold; color: #00d4ff;">
                ${player.score} points
            </div>
        `;
        finalScores.appendChild(scoreItem);
    });
    
    document.getElementById('endGameModal').style.display = 'block';
}

function resetGame() {
    location.reload();
}

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

function updateUI() {
    if (!gameState.gameStarted) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    document.getElementById('currentPlayerIndicator').style.backgroundColor = currentPlayer.color;
    document.getElementById('currentPlayerName').textContent = currentPlayer.name;
    document.getElementById('currentColonies').textContent = currentPlayer.colonies;
    
    // Update player list
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    gameState.players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <div class="player-color" style="background-color: ${player.color}"></div>
            <span class="player-name">${player.name}</span>
            <span class="player-score">${player.colonies}/10</span>
        `;
        playerList.appendChild(item);
    });
}

function log(message) {
    const logMessages = document.getElementById('logMessages');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logMessages.insertBefore(entry, logMessages.firstChild);
    
    // Keep only last 10 messages
    while (logMessages.children.length > 10) {
        logMessages.removeChild(logMessages.lastChild);
    }
}

// WebSocket message handlers
function handlePlayerJoined(data) {
    log(`${data.player_name} joined from ${data.home_planet}!`);
}

function handleGameStarted(data) {
    gameState.players = data.players;
    initializeBoard();
    actuallyStartGame();
}

function handlePlayerMoved(data) {
    const player = gameState.players[data.player_index];
    player.position = data.position;
    log(`${player.name} moved to ${data.system_name}`);
    drawBoard();
    updateUI();
}

function handleLifeChecked(data) {
    document.getElementById('die1').textContent = data.die1;
    document.getElementById('die2').textContent = data.die2;
    
    if (data.has_life) {
        document.getElementById('diceResult').textContent = `Life detected! (${data.total})`;
        log(`Planet has intelligent life! Must battle aliens.`);
        gameState.currentPlanetHasLife = true;
    } else {
        document.getElementById('diceResult').textContent = `No life (${data.total})`;
        log(`Dead planet found.`);
        gameState.currentPlanetHasLife = false;
    }
    
    if (data.player_index === myPlayerIndex) {
        document.getElementById('colonizeBtn').disabled = false;
        document.getElementById('checkLifeBtn').disabled = true;
    }
}

function handlePlanetColonized(data) {
    const system = BOARD_STRUCTURE.find(s => s.q === data.system.q && s.r === data.system.r);
    if (system) {
        system.colonies[data.planet_index] = {
            playerId: data.player_index,
            hadLife: data.had_life
        };
        
        const player = gameState.players[data.player_index];
        player.colonies++;
        
        log(`${player.name} colonized a ${data.had_life ? 'inhabited' : 'dead'} planet!`);
    }
    
    drawBoard();
    updateUI();
}

function handleBattleResult(data) {
    document.getElementById('attackerDie1').textContent = data.player_dice[0];
    document.getElementById('attackerDie2').textContent = data.player_dice[1];
    document.getElementById('attackerTotal').textContent = data.player_total;
    
    document.getElementById('defenderDie1').textContent = data.opponent_dice[0];
    document.getElementById('defenderDie2').textContent = data.opponent_dice[1];
    document.getElementById('defenderTotal').textContent = data.opponent_total;
    
    let result;
    if (data.winner === 'player') {
        result = '🎉 You win! Planet colonized!';
    } else if (data.winner === 'opponent') {
        result = '😞 You lost! Cannot colonize.';
    } else {
        result = '🤝 Tie! Roll again.';
    }
    
    document.getElementById('battleResult').textContent = result;
    document.getElementById('rollBattleBtn').style.display = 'none';
    document.getElementById('closeBattleBtn').style.display = 'block';
}

function handleTurnEnded(data) {
    gameState.currentPlayerIndex = data.next_player_index;
    gameState.movesThisTurn = 0;
    gameState.hasColonizedThisTurn = false;
    gameState.currentPlanetHasLife = false;
    gameState.selectedHex = null;
    
    document.getElementById('checkLifeBtn').disabled = true;
    document.getElementById('colonizeBtn').disabled = true;
    document.getElementById('diceResult').textContent = '';
    document.getElementById('die1').textContent = '?';
    document.getElementById('die2').textContent = '?';
    
    log(`${gameState.players[gameState.currentPlayerIndex].name}'s turn`);
    
    drawBoard();
    updateUI();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initGame);

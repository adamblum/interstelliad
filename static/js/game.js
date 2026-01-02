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
    turnPhase: 'loadCities', // 'rollForTurn', 'loadCities', 'planning', 'moving', 'action'
    movesThisTurn: 0,
    maxMovesPerTurn: 3,
    hasColonizedThisTurn: false,
    isOrganizer: false,
    maxPlayers: 2,
    joinedPlayers: [],
    currentPlayerName: null,
    currentPlayerPlanet: null,
    turnOrderRolls: {}, // Store player rolls for turn order
    rollOrder: [], // Track the order in which players rolled (for tiebreaker)
    destinationHex: null, // Current destination for movement
    citiesOnShip: 0, // Cities currently on ship
    hasLoadedCities: false, // Whether player has loaded cities this game
    movementPath: [], // Array of hexes in current movement path
    remainingMoves: 0 // Moves remaining this turn
};

// Player colors
const PLAYER_COLORS = ['#ff4444', '#4444ff', '#44ff44', '#ffff44'];

// Home planets and their starting positions
// Sol is at col 13, row 8, which converts to axial coordinates
// Planets are arranged around Sol: East, Southeast, Southwest, West
// We'll calculate these dynamically from BOARD_STRUCTURE after it's built
const HOME_PLANETS = {};

// Canvas and context
let canvas, ctx;

// Hex grid configuration
const HEX_RADIUS = 30; // Increased for better visibility
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;

// Sol coordinates in offset system
const SOL_COL = 13;
const SOL_ROW = 8;

// Board structure from the PDF - using offset coordinates (col, row)
// Converting to axial coordinates for hex math: q = col - (row - (row&1)) / 2, r = row
const STAR_SYSTEMS_DATA = [
    { star: "Struve 2398", col: 22, row: 2, planets: [{name: "a", life: 5}, {name: "b", life: 5}] },
    { star: "Lalande 21185", col: 5, row: 3, planets: [{name: "b", life: 5}, {name: "c", life: 5}] },
    { star: "Barnard's Star", col: 19, row: 9, planets: [{name: "b", life: 2}] },
    { star: "Ross 128", col: 1, row: 9, planets: [{name: "b", life: 4}] },
    { star: "Wolf 359", col: 5, row: 9, planets: [{name: "b", life: 3}, {name: "c", life: 2}] },
    { star: "Groombridge 34", col: 23, row: 11, planets: [{name: "x", life: 4}] },
    { star: "Ross 248", col: 23, row: 12, planets: [{name: "x", life: 3}] },
    { star: "P Centauri", col: 13, row: 13, planets: [{name: "b", life: 4}, {name: "c", life: 2}] },
    { star: "A Centauri", col: 14, row: 14, planets: [{name: "x", life: 3}] },
    { star: "Sirius", col: 5, row: 15, planets: [{name: "x", life: 3}] },
    { star: "Ross 154", col: 20, row: 17, planets: [{name: "x", life: 3}] },
    { star: "E Eridani", col: 4, row: 19, planets: [{name: "b", life: 4}, {name: "c", life: 2}] },
    { star: "Tau Ceti", col: 11, row: 19, planets: [{name: "b", life: 2}, {name: "c", life: 2}, {name: "d", life: 2}, {name: "e", life: 4}, {name: "f", life: 4}] },
    { star: "UV Ceti", col: 12, row: 20, planets: [{name: "a", life: 1}, {name: "b", life: 1}] },
    { star: "Lacaille 9352", col: 17, row: 20, planets: [{name: "b", life: 2}, {name: "c", life: 3}] },
    { star: "Sol", col: 13, row: 8, planets: [{name: "Earth", life: null, isHome: true}, {name: "Mars", life: null, isHome: true}, {name: "Jupiter", life: null, isHome: true}, {name: "The Belt", life: null, isHome: true}] }
];

// Convert offset coordinates to axial hex coordinates
function offsetToAxial(col, row) {
    const q = col - (row - (row & 1)) / 2;
    const r = row;
    return { q, r };
}

// Generate full board structure with stars and planets as separate hexes
const BOARD_STRUCTURE = [];

// Color palette for stars
const STAR_COLORS = {
    "Struve 2398": "#9c27b0",
    "Lalande 21185": "#ff9800",
    "Barnard's Star": "#f44336",
    "Ross 128": "#e91e63",
    "Wolf 359": "#ff5722",
    "Groombridge 34": "#8bc34a",
    "Ross 248": "#cddc39",
    "P Centauri": "#ffc107",
    "A Centauri": "#ffab00",
    "Sirius": "#2196f3",
    "Ross 154": "#00bcd4",
    "E Eridani": "#03a9f4",
    "Tau Ceti": "#ffeb3b",
    "UV Ceti": "#e1f5fe",
    "Lacaille 9352": "#00acc1",
    "Sol": "#ffeb3b"
};

// Build board with stars and their planets as adjacent hexes
STAR_SYSTEMS_DATA.forEach(system => {
    const starPos = offsetToAxial(system.col, system.row);
    const color = STAR_COLORS[system.star] || '#888888';
    
    // Add the star system itself
    BOARD_STRUCTURE.push({
        q: starPos.q,
        r: starPos.r,
        type: 'star',
        name: system.star,
        color: color,
        planetCount: system.planets.length
    });
    
    // Add planets as adjacent hexes (distributed around the star)
    // Special handling for P Centauri to avoid collision with A Centauri
    let directions;
    if (system.star === "P Centauri") {
        // Use Northwest and Northeast directions to avoid A Centauri
        directions = [
            {q: 0, r: -1},  // Northwest
            {q: 1, r: -1},  // Northeast
            {q: 1, r: 0},   // East
            {q: 0, r: 1},   // Southeast
            {q: -1, r: 1},  // Southwest
            {q: -1, r: 0}   // West
        ];
    } else {
        // Default directions
        directions = [
            {q: 1, r: 0},   // East
            {q: 0, r: 1},   // Southeast
            {q: -1, r: 1},  // Southwest
            {q: -1, r: 0},  // West
            {q: 0, r: -1},  // Northwest
            {q: 1, r: -1}   // Northeast
        ];
    }
    
    system.planets.forEach((planet, index) => {
        const dir = directions[index % 6];
        BOARD_STRUCTURE.push({
            q: starPos.q + dir.q,
            r: starPos.r + dir.r,
            type: 'planet',
            name: `${system.star} ${planet.name}`,
            shortName: planet.name,
            parentStar: system.star,
            parentQ: starPos.q,
            parentR: starPos.r,
            lifeProbability: planet.life,
            color: color,
            isHome: planet.isHome || false
        });
    });
});

// Populate HOME_PLANETS from BOARD_STRUCTURE
BOARD_STRUCTURE.forEach(hex => {
    if (hex.isHome && hex.type === 'planet') {
        const planetName = hex.shortName;
        HOME_PLANETS[planetName] = {
            q: hex.q,
            r: hex.r,
            emoji: planetName === 'Earth' ? '🌍' : planetName === 'Mars' ? '🔴' : planetName === 'Jupiter' ? '🪐' : '☄️',
            planetIndex: Object.keys(HOME_PLANETS).length
        };
    }
});

// Initialize canvas
function initCanvas() {
    canvas = document.getElementById('gameBoard');
    ctx = canvas.getContext('2d');
    
    // Calculate canvas size based on board dimensions
    // Board ranges: col 1-23, row 2-20
    const minCol = 1, maxCol = 23;
    const minRow = 2, maxRow = 20;
    
    // Convert board corners to axial coordinates
    const minAxial = offsetToAxial(minCol, minRow);
    const maxAxial = offsetToAxial(maxCol, maxRow);
    
    // Calculate required canvas dimensions with padding
    const colRange = maxCol - minCol + 6; // Extra space for planets around stars
    const rowRange = maxRow - minRow + 6;
    
    const canvasWidth = colRange * HEX_WIDTH + HEX_RADIUS * 4;
    const canvasHeight = rowRange * HEX_HEIGHT * 0.75 + HEX_RADIUS * 4;
    
    // Set canvas size
    canvas.width = Math.ceil(canvasWidth);
    canvas.height = Math.ceil(canvasHeight);
    
    console.log(`[CANVAS] Canvas size: ${canvas.width}x${canvas.height}`);
    
    canvas.addEventListener('click', handleCanvasClick);
}

// Hex coordinate to pixel conversion (centered on Sol)
function hexToPixel(q, r) {
    const solAxial = offsetToAxial(SOL_COL, SOL_ROW);
    const x = HEX_RADIUS * (Math.sqrt(3) * (q - solAxial.q) + Math.sqrt(3)/2 * (r - solAxial.r)) + canvas.width / 2;
    const y = HEX_RADIUS * (3/2 * (r - solAxial.r)) + canvas.height / 2;
    return { x, y };
}

// Pixel to hex coordinate conversion (centered on Sol)
function pixelToHex(x, y) {
    const solAxial = offsetToAxial(SOL_COL, SOL_ROW);
    const relX = x - canvas.width / 2;
    const relY = y - canvas.height / 2;
    
    const q = (Math.sqrt(3)/3 * relX - 1/3 * relY) / HEX_RADIUS + solAxial.q;
    const r = (2/3 * relY) / HEX_RADIUS + solAxial.r;
    
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
function drawHex(x, y, radius, fillColor, strokeColor = '#ffffff', lineWidth = 2) {
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
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

// Draw hex grid for empty space hexes
function drawHexGrid() {
    // Calculate bounds from board structure
    let minQ = Infinity, maxQ = -Infinity;
    let minR = Infinity, maxR = -Infinity;
    
    BOARD_STRUCTURE.forEach(hex => {
        if (hex.type === 'star') { // Only use stars for bounds
            minQ = Math.min(minQ, hex.q);
            maxQ = Math.max(maxQ, hex.q);
            minR = Math.min(minR, hex.r);
            maxR = Math.max(maxR, hex.r);
        }
    });
    
    // Expand bounds slightly
    minQ -= 2;
    maxQ += 2;
    minR -= 2;
    maxR += 2;
    
    // Get current position if in movement mode
    let currentPos = null;
    if (gameState.turnPhase === 'moving' && gameState.movementPath.length > 0) {
        currentPos = gameState.movementPath[gameState.movementPath.length - 1];
        console.log('[DRAW_HEX_GRID] In movement mode. Current pos:', currentPos, 'Remaining:', gameState.remainingMoves);
    }
    
    // Draw hex grid
    for (let q = minQ; q <= maxQ; q++) {
        for (let r = minR; r <= maxR; r++) {
            // Check if this hex is already occupied by a star or planet
            const occupied = BOARD_STRUCTURE.find(h => h.q === q && h.r === r);
            if (!occupied) {
                const pos = hexToPixel(q, r);
                
                // Only draw if within canvas bounds
                if (pos.x > -HEX_RADIUS && pos.x < canvas.width + HEX_RADIUS &&
                    pos.y > -HEX_RADIUS && pos.y < canvas.height + HEX_RADIUS) {
                    
                    // Check if this empty hex is adjacent during movement
                    let strokeColor = '#333333';
                    let lineWidth = 0.5;
                    
                    if (currentPos && gameState.remainingMoves > 0) {
                        const distance = Math.max(
                            Math.abs(q - currentPos.q),
                            Math.abs(r - currentPos.r),
                            Math.abs((-q - r) - (-currentPos.q - currentPos.r))
                        );
                        if (distance === 1) {
                            strokeColor = '#ffff00'; // Yellow for adjacent
                            lineWidth = 2;
                        }
                    }
                    
                    // Check if this is the current position (for empty space)
                    if (currentPos && q === currentPos.q && r === currentPos.r) {
                        strokeColor = '#00ff00'; // Green for current position
                        lineWidth = 3;
                    }
                    
                    // Draw empty hex
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i - Math.PI / 6;
                        const hx = pos.x + HEX_RADIUS * Math.cos(angle);
                        const hy = pos.y + HEX_RADIUS * Math.sin(angle);
                        if (i === 0) {
                            ctx.moveTo(hx, hy);
                        } else {
                            ctx.lineTo(hx, hy);
                        }
                    }
                    ctx.closePath();
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                }
            }
        }
    }
}

// Draw the board
function drawBoard() {
    // Clear canvas with space background
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars in background
    drawBackgroundStars();
    
    // Draw hex grid for empty space
    drawHexGrid();
    
    // Draw all hexes (stars and planets)
    BOARD_STRUCTURE.forEach(hex => {
        const pos = hexToPixel(hex.q, hex.r);
        
        // Check if hex is selected
        const isSelected = gameState.selectedHex && 
                          gameState.selectedHex.q === hex.q && 
                          gameState.selectedHex.r === hex.r;
        
        // Check if player is here
        const playerHere = gameState.players.find(p => 
            p.position && p.position.q === hex.q && p.position.r === hex.r
        );
        
        // Check if we're in movement mode
        let isCurrentPosition = false;
        let isAdjacentHex = false;
        if (gameState.turnPhase === 'moving' && gameState.movementPath.length > 0) {
            const currentPos = gameState.movementPath[gameState.movementPath.length - 1];
            isCurrentPosition = hex.q === currentPos.q && hex.r === currentPos.r;
            
            // Check if this hex is adjacent to current position
            const distance = Math.max(
                Math.abs(hex.q - currentPos.q),
                Math.abs(hex.r - currentPos.r),
                Math.abs((-hex.q - hex.r) - (-currentPos.q - currentPos.r))
            );
            isAdjacentHex = distance === 1 && gameState.remainingMoves > 0;
        }
        
        if (hex.type === 'star') {
            // Draw star system hex
            let strokeColor = '#888888';
            let lineWidth = 2;
            if (isCurrentPosition) { strokeColor = '#00ff00'; lineWidth = 4; }
            else if (isAdjacentHex) { strokeColor = '#ffff00'; lineWidth = 3; }
            else if (isSelected) { strokeColor = '#00ff00'; lineWidth = 3; }
            
            drawHex(pos.x, pos.y, HEX_RADIUS, hex.color + '44', strokeColor, lineWidth);
            
            // Draw star glow
            drawStarGlow(pos.x, pos.y, 10, hex.color);
            
            // Draw system name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(hex.name, pos.x, pos.y + 4);
            
            // Draw coordinates
            ctx.fillStyle = '#666666';
            ctx.font = '7px Arial';
            ctx.fillText(`(${hex.q},${hex.r})`, pos.x, pos.y - 15);
            
        } else if (hex.type === 'planet') {
            // Draw planet hex
            let strokeColor = '#666666';
            let lineWidth = 2;
            if (isCurrentPosition) { strokeColor = '#00ff00'; lineWidth = 4; }
            else if (isAdjacentHex) { strokeColor = '#ffff00'; lineWidth = 3; }
            else if (isSelected) { strokeColor = '#00ff00'; lineWidth = 3; }
            else if (playerHere) { strokeColor = '#ffff00'; lineWidth = 2; }
            
            // Check if planet is colonized
            const isColonized = hex.colonizedBy !== undefined;
            const bgColor = isColonized ? PLAYER_COLORS[hex.colonizedBy] + '66' : hex.color + '22';
            
            drawHex(pos.x, pos.y, HEX_RADIUS, bgColor, strokeColor, lineWidth);
            
            // Draw life probability number
            if (hex.lifeProbability !== null) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(hex.lifeProbability, pos.x, pos.y + 5);
            }
            
            // Draw planet name label
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(hex.shortName, pos.x, pos.y - 12);
            
            // Draw coordinates
            ctx.fillStyle = '#444444';
            ctx.font = '6px Arial';
            ctx.fillText(`(${hex.q},${hex.r})`, pos.x, pos.y + 18);
            
            // Draw home planet indicator
            if (hex.isHome) {
                ctx.fillStyle = '#ffff00';
                ctx.font = 'bold 16px Arial';
                ctx.fillText('🏠', pos.x, pos.y - 20);
            }
            
            // Draw colony indicator
            if (isColonized) {
                ctx.fillStyle = PLAYER_COLORS[hex.colonizedBy];
                ctx.font = 'bold 12px Arial';
                ctx.fillText('⬢', pos.x, pos.y + 20);
            }
        }
        
        // Draw player ships
        if (playerHere) {
            const shipX = pos.x;
            const shipY = pos.y + (hex.type === 'star' ? 15 : 25);
            
            // Highlight the current player's ship
            if (playerHere.id === myPlayerIndex && gameState.gameStarted) {
                // Draw pulsing glow around current player's ship
                ctx.save();
                ctx.beginPath();
                ctx.arc(shipX, shipY - 3, 15, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.fill();
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
            
            ctx.fillStyle = PLAYER_COLORS[playerHere.id];
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🚀', shipX, shipY);
        }
    });
    
    // Draw movement path if in movement mode
    if (gameState.turnPhase === 'moving' && gameState.movementPath.length > 1) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        for (let i = 0; i < gameState.movementPath.length; i++) {
            const pathHex = gameState.movementPath[i];
            const pos = hexToPixel(pathHex.q, pathHex.r);
            
            if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw circles at each point in path
        gameState.movementPath.forEach((pathHex, index) => {
            const pos = hexToPixel(pathHex.q, pathHex.r);
            ctx.fillStyle = index === 0 ? '#ffff00' : '#00ff00';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw step number
            if (index > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(index.toString(), pos.x, pos.y - 10);
            }
        });
    }
}

function drawBackgroundStars() {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawStarGlow(x, y, size, color) {
    // Star center
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Star glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, color + 'cc');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fill();
}

// Draw a hexagon
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
            // Don't allow selecting taken planets
            if (this.classList.contains('taken')) {
                return;
            }
            
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
    
    // Room code input - fetch room status to show taken planets
    document.getElementById('roomCodeInput').addEventListener('input', function() {
        const roomCodeInput = this.value.trim().toUpperCase();
        if (roomCodeInput.length >= 6) {
            // Fetch room status to see which planets are taken
            fetch(`/room-status/${roomCodeInput}/`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('[ROOM_CODE_INPUT] Room status:', data);
                        updateAvailablePlanets(data.players);
                    }
                })
                .catch(error => console.error('[ROOM_CODE_INPUT] Error fetching room status:', error));
        }
    });
    
    // Game controls
    document.getElementById('moveBtn').addEventListener('click', handleMove);
    document.getElementById('checkLifeBtn').addEventListener('click', checkForLife);
    document.getElementById('colonizeBtn').addEventListener('click', colonizePlanet);
    document.getElementById('endTurnBtn').addEventListener('click', endTurn);
    document.getElementById('rollBattleBtn').addEventListener('click', rollBattle);
    document.getElementById('closeBattleBtn').addEventListener('click', closeBattle);
    document.getElementById('newGameBtn').addEventListener('click', resetGame);
    
    // Movement controls
    document.getElementById('confirmMoveBtn').addEventListener('click', confirmMove);
    document.getElementById('redoMoveBtn').addEventListener('click', redoMove);
    
    // New game flow controls
    document.getElementById('rollForTurnBtn').addEventListener('click', rollForTurnOrder);
    document.getElementById('loadCitiesBtn').addEventListener('click', loadCities);
}

function showRoleSelection() {
    document.getElementById('roleSelection').style.display = 'block';
    document.getElementById('organizerSetup').style.display = 'none';
    document.getElementById('playerJoin').style.display = 'none';
    document.getElementById('playerLogin').style.display = 'none';
    document.getElementById('roomCodeDisplay').style.display = 'none';
    
    // Re-enable room code input
    document.getElementById('roomCodeInput').value = '';
    document.getElementById('roomCodeInput').disabled = false;
    
    // Clear selected planet
    document.querySelectorAll('.planet-option').forEach(o => o.classList.remove('selected'));
    gameState.currentPlayerPlanet = null;
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
    
    // Fetch room status when joiner enters room code to see taken planets
    // (will be called after entering room code in another function)
}

function createGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    gameState.maxPlayers = playerCount;
    gameState.isOrganizer = true;
    
    // Get CSRF token
    const csrftoken = getCookie('csrftoken');
    
    console.log('[CREATE_GAME] Creating room with', playerCount, 'players');
    
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
        console.log('[CREATE_GAME] Response:', data);
        if (data.success) {
            roomCode = data.room_code;
            console.log('[CREATE_GAME] Room created:', roomCode);
            
            // Show room code
            document.getElementById('roomCodeDisplay').style.display = 'block';
            document.getElementById('roomCodeText').textContent = roomCode;
            
            // Show player selection for organizer to join as first player
            document.getElementById('organizerSetup').style.display = 'none';
            document.getElementById('playerLogin').style.display = 'block';
            
            // Pre-fill the room code
            document.getElementById('roomCodeInput').value = roomCode;
            document.getElementById('roomCodeInput').disabled = true;
            
            log(`Game created! Room code: ${roomCode}. Now choose your planet.`);
        } else {
            alert('Error creating game: ' + data.error);
        }
    })
    .catch(error => {
        console.error('[CREATE_GAME] Error:', error);
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
                    updateAvailablePlanets(data.players);
                    
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

function updateAvailablePlanets(players) {
    // Get list of taken planets
    const takenPlanets = players.map(p => p.home_planet);
    
    console.log('[UPDATE_PLANETS] Taken planets:', takenPlanets);
    
    // Update planet options
    document.querySelectorAll('.planet-option').forEach(option => {
        const planet = option.dataset.planet;
        if (takenPlanets.includes(planet)) {
            option.classList.add('taken');
            option.style.opacity = '0.3';
            option.style.cursor = 'not-allowed';
            option.style.filter = 'grayscale(100%)';
        } else {
            option.classList.remove('taken');
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
            option.style.filter = 'none';
        }
    });
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
                    score: 0,
                    citiesOnShip: 0,
                    velocity: 9,
                    hasLoadedCities: false
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
    
    document.getElementById('gameSetup').style.display = 'none';
    document.getElementById('gameInfo').style.display = 'block';
    document.getElementById('roomCodeDisplay').style.display = 'none';
    
    // Start with rolling for turn order
    gameState.turnPhase = 'rollForTurn';
    log('Game started! All players roll to determine turn order.');
    
    // Show roll button for all players
    showRollForTurnUI();
    
    drawBoard();
}

function handleCanvasClick(event) {
    if (!gameState.gameStarted) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const hex = pixelToHex(x, y);
    
    // If in movement mode, handle step-by-step movement
    if (gameState.turnPhase === 'moving') {
        handleMovementClick(hex);
        return;
    }
    
    // Check if this is a valid hex
    const system = BOARD_STRUCTURE.find(s => s.q === hex.q && s.r === hex.r);
    if (system) {
        gameState.selectedHex = hex;
        drawBoard();
        updateUI();
    }
}

function handleMovementClick(hex) {
    console.log('[MOVEMENT_CLICK] Clicked hex:', hex);
    console.log('[MOVEMENT_CLICK] Turn phase:', gameState.turnPhase);
    console.log('[MOVEMENT_CLICK] Movement path:', gameState.movementPath);
    console.log('[MOVEMENT_CLICK] Remaining moves:', gameState.remainingMoves);
    
    if (myPlayerIndex !== gameState.currentPlayerIndex) {
        console.log('[MOVEMENT_CLICK] Not my turn');
        return;
    }
    
    // Get current position (last hex in path)
    const currentPos = gameState.movementPath[gameState.movementPath.length - 1];
    console.log('[MOVEMENT_CLICK] Current position:', currentPos);
    
    // Check if clicked hex is adjacent to current position
    const distance = Math.max(
        Math.abs(currentPos.q - hex.q),
        Math.abs(currentPos.r - hex.r),
        Math.abs((-currentPos.q - currentPos.r) - (-hex.q - hex.r))
    );
    console.log('[MOVEMENT_CLICK] Distance:', distance);
    
    if (distance !== 1) {
        log('You can only move to adjacent hexes (highlighted in yellow)!');
        return;
    }
    
    // Check if we have moves remaining
    if (gameState.remainingMoves <= 0) {
        log('No moves remaining! Click "End Move" to confirm or "Redo Move" to start over.');
        return;
    }
    
    // Allow movement to any hex (empty space or occupied)
    // Add to movement path
    gameState.movementPath.push({ q: hex.q, r: hex.r });
    gameState.remainingMoves--;
    
    console.log('[MOVEMENT_CLICK] Added to path. New remaining:', gameState.remainingMoves);
    
    document.getElementById('movesRemaining').textContent = gameState.remainingMoves;
    
    if (gameState.remainingMoves === 0) {
        log('Maximum moves reached! Click "End Move" to confirm or "Redo Move" to start over.');
    } else {
        log(`Moved to (${hex.q}, ${hex.r}). ${gameState.remainingMoves} moves remaining.`);
    }
    
    drawBoard();
}

function handleMove() {
    console.log('[HANDLE_MOVE] Function called');
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (myPlayerIndex !== gameState.currentPlayerIndex) {
        log("It's not your turn!");
        return;
    }
    
    // Check if player is at their home planet - allow reloading cities any time they're home
    const homePlanet = HOME_PLANETS[currentPlayer.planet];
    const isAtHome = currentPlayer.position.q === homePlanet.q && currentPlayer.position.r === homePlanet.r;
    
    console.log('[HANDLE_MOVE] At home?', isAtHome, 'Has loaded cities?', currentPlayer.hasLoadedCities);
    
    if (isAtHome) {
        // Player is at home planet - show city loading UI to choose/reload cities
        // Calculate available cities (max 10 minus what's already on ship)
        const citiesOnShip = currentPlayer.citiesOnShip || 0;
        const availableCities = Math.max(0, 10 - citiesOnShip);
        
        console.log('[HANDLE_MOVE] Showing city loading. Available:', availableCities);
        log(`At your home planet! You have ${availableCities} cities available to load.`);
        document.getElementById('citiesInput').max = availableCities;
        document.getElementById('citiesInput').value = 0;
        document.getElementById('loadCitiesSection').style.display = 'block';
        document.getElementById('movementSection').style.display = 'none'; // Hide entire movement section
        gameState.turnPhase = 'loadCities';
        return;
    }
    
    const velocity = currentPlayer.velocity || (9 - (currentPlayer.citiesOnShip || 0));
    
    if (velocity <= 0) {
        log('Your ship is too heavy to move! (Velocity must be > 0)');
        return;
    }
    
    console.log('[HANDLE_MOVE] Starting movement mode. Velocity:', velocity);
    
    // Start movement mode
    gameState.turnPhase = 'moving';
    gameState.movementPath = [{ q: currentPlayer.position.q, r: currentPlayer.position.r }];
    gameState.remainingMoves = velocity;
    
    console.log('[HANDLE_MOVE] Set turnPhase to:', gameState.turnPhase);
    console.log('[HANDLE_MOVE] Movement path:', gameState.movementPath);
    console.log('[HANDLE_MOVE] Remaining moves:', gameState.remainingMoves);
    
    log(`Click on adjacent hexes (highlighted in yellow) to move. ${velocity} moves available.`);
    
    // Hide Start Move button, show movement controls
    const moveBtn = document.getElementById('moveBtn');
    const movementControls = document.getElementById('movementControls');
    const movesRemaining = document.getElementById('movesRemaining');
    
    console.log('[HANDLE_MOVE] moveBtn:', moveBtn);
    console.log('[HANDLE_MOVE] movementControls:', movementControls);
    
    if (moveBtn) moveBtn.style.display = 'none';
    if (movementControls) {
        movementControls.style.display = 'block';
        console.log('[HANDLE_MOVE] Showed movementControls');
    }
    if (movesRemaining) movesRemaining.textContent = velocity;
    
    drawBoard();
    console.log('[HANDLE_MOVE] Called drawBoard');
}

function confirmMove() {
    if (myPlayerIndex !== gameState.currentPlayerIndex) return;
    if (gameState.movementPath.length <= 1) {
        log('No movement to confirm!');
        return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const finalPosition = gameState.movementPath[gameState.movementPath.length - 1];
    
    // Update player position
    currentPlayer.position = { q: finalPosition.q, r: finalPosition.r };
    
    const hexesMoved = gameState.movementPath.length - 1;
    log(`${currentPlayer.name} moved ${hexesMoved} ${hexesMoved === 1 ? 'hex' : 'hexes'}.`);
    
    // Broadcast move to other players
    sendWebSocketMessage({
        type: 'player_moved',
        player_index: myPlayerIndex,
        position: currentPlayer.position,
        path: gameState.movementPath
    });
    
    // Check if player is on a planet
    const currentHex = BOARD_STRUCTURE.find(h => 
        h.q === currentPlayer.position.q && h.r === currentPlayer.position.r
    );
    
    if (currentHex && currentHex.type === 'planet') {
        document.getElementById('checkLifeBtn').disabled = false;
        document.getElementById('colonizeBtn').disabled = false;
    }
    
    // Clean up movement state
    gameState.movementPath = [];
    gameState.remainingMoves = 0;
    gameState.turnPhase = 'action';
    
    // Hide movement controls, show Start Move button
    document.getElementById('movementControls').style.display = 'none';
    const moveBtn = document.getElementById('moveBtn');
    if (moveBtn) {
        moveBtn.style.display = 'block';
        moveBtn.style.visibility = 'visible';
        moveBtn.style.opacity = '1';
    }
    
    drawBoard();
    updateUI();
}

function redoMove() {
    if (myPlayerIndex !== gameState.currentPlayerIndex) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const velocity = currentPlayer.velocity || (9 - (currentPlayer.citiesOnShip || 0));
    
    // Reset movement state
    gameState.movementPath = [{ q: currentPlayer.position.q, r: currentPlayer.position.r }];
    gameState.remainingMoves = velocity;
    
    document.getElementById('movesRemaining').textContent = velocity;
    log('Movement reset. Click adjacent hexes to plan your route.');
    
    drawBoard();
}

function checkForLife() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentHex = BOARD_STRUCTURE.find(h => 
        h.q === currentPlayer.position.q && h.r === currentPlayer.position.r
    );
    
    if (!currentHex || currentHex.type !== 'planet') {
        log('You must be on a planet to check for life!');
        return;
    }
    
    // Skip life check for home planets (they're already known)
    if (currentHex.isHome) {
        log('This is a home planet, no need to check for life.');
        return;
    }
    
    // Roll single die and compare to life probability
    const dieRoll = rollDie();
    const lifeProbability = currentHex.lifeProbability || 0;
    
    document.getElementById('die1').textContent = dieRoll;
    document.getElementById('die2').textContent = ''; // Hide second die
    
    // Check for life: roll must be <= life probability
    const hasLife = dieRoll <= lifeProbability;
    
    if (hasLife) {
        document.getElementById('diceResult').textContent = `Life detected! (Rolled ${dieRoll} ≤ ${lifeProbability})`;
        log(`${currentPlayer.name} found intelligent life on ${currentHex.name}! Must battle aliens.`);
        gameState.currentPlanetHasLife = true;
        currentHex.hasLife = true;
        
        // Trigger battle with aliens
        battleAliens(currentHex);
    } else {
        document.getElementById('diceResult').textContent = `No life (Rolled ${dieRoll} > ${lifeProbability})`;
        log(`${currentPlayer.name} found a dead planet.`);
        gameState.currentPlanetHasLife = false;
        currentHex.hasLife = false;
        
        // Enable colonize button for dead planet
        document.getElementById('colonizeBtn').disabled = false;
    }
    
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

// Battle aliens when life is detected
function battleAliens(planetHex) {
    gameState.battleState = {
        opponent: 'aliens',
        planetQ: planetHex.q,
        planetR: planetHex.r,
        playerRolled: false
    };
    
    document.getElementById('battleTitle').textContent = 'Battle Aliens!';
    document.getElementById('battleDescription').textContent = 
        `You must defeat the aliens on ${planetHex.name} to colonize this planet!`;
    document.getElementById('attackerName').textContent = gameState.players[gameState.currentPlayerIndex].name;
    document.getElementById('defenderName').textContent = 'Aliens';
    document.getElementById('battleResult').textContent = '';
    document.getElementById('rollBattleBtn').style.display = 'block';
    document.getElementById('closeBattleBtn').style.display = 'none';
    
    document.getElementById('battleModal').style.display = 'block';
}

function startBattle(opponent, planetHex) {
    gameState.battleState = {
        opponent: opponent,
        planetQ: planetHex.q,
        planetR: planetHex.r,
        playerRolled: false
    };
    
    document.getElementById('battleTitle').textContent = 
        opponent === 'aliens' ? 'Battle Aliens!' : 'Battle Enemy Colony!';
    document.getElementById('battleDescription').textContent = 
        opponent === 'aliens' 
            ? `You must defeat the aliens on ${planetHex.name} to colonize this planet!`
            : `You must defeat the defender on ${planetHex.name} to colonize this planet!`;
    document.getElementById('attackerName').textContent = gameState.players[gameState.currentPlayerIndex].name;
    document.getElementById('defenderName').textContent = opponent === 'aliens' ? 'Aliens' : 'Defender';
    document.getElementById('battleResult').textContent = '';
    document.getElementById('rollBattleBtn').style.display = 'block';
    document.getElementById('closeBattleBtn').style.display = 'none';
    
    document.getElementById('battleModal').style.display = 'block';
}

function rollBattle() {
    if (gameState.battleState.playerRolled) return;
    
    // Roll single die for player (attacker)
    const playerRoll = rollDie();
    
    // Roll single die for opponent (defender)
    const opponentRoll = rollDie();
    
    document.getElementById('attackerDie1').textContent = playerRoll;
    document.getElementById('attackerDie2').textContent = ''; // Hide second die
    document.getElementById('attackerTotal').textContent = playerRoll;
    
    document.getElementById('defenderDie1').textContent = opponentRoll;
    document.getElementById('defenderDie2').textContent = ''; // Hide second die
    document.getElementById('defenderTotal').textContent = opponentRoll;
    
    gameState.battleState.playerRolled = true;
    
    // Determine winner (ties go to attacker)
    let result;
    if (playerRoll >= opponentRoll) {
        result = '🎉 You win! Planet colonized!';
        const currentHex = BOARD_STRUCTURE.find(h => 
            h.q === gameState.battleState.planetQ && 
            h.r === gameState.battleState.planetR
        );
        if (currentHex) {
            placeColony(currentHex, true);
        }
    } else {
        result = '😞 You lost! Cannot colonize.';
        log(`${gameState.players[gameState.currentPlayerIndex].name} lost the battle.`);
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

function placeColony(planetHex, hadLife) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Mark planet as colonized
    planetHex.colonizedBy = currentPlayer.id;
    planetHex.hadLife = hadLife;
    
    currentPlayer.colonies++;
    
    // Update score
    const points = hadLife ? 2 : 1;
    currentPlayer.score = (currentPlayer.score || 0) + points;
    
    gameState.hasColonizedThisTurn = true;
    
    log(`${currentPlayer.name} colonized ${planetHex.name}! ${hadLife ? '+2 points (had life)' : '+1 point (dead planet)'}`);
    
    document.getElementById('colonizeBtn').disabled = true;
    
    // Send colonize message via WebSocket
    sendWebSocketMessage({
        type: 'colonize',
        player_index: currentPlayer.id,
        planet_q: planetHex.q,
        planet_r: planetHex.r,
        had_life: hadLife
    });
    
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
    gameState.turnPhase = 'planning'; // Reset to planning phase
    
    document.getElementById('checkLifeBtn').disabled = true;
    document.getElementById('colonizeBtn').disabled = true;
    document.getElementById('diceResult').textContent = '';
    document.getElementById('die1').textContent = '?';
    document.getElementById('die2').textContent = '?';
    
    // Show movement section and Start Move button
    const movementSection = document.getElementById('movementSection');
    const moveBtn = document.getElementById('moveBtn');
    const movementControls = document.getElementById('movementControls');
    
    if (movementSection) {
        movementSection.style.display = 'block';
        movementSection.style.visibility = 'visible';
    }
    
    if (moveBtn) {
        moveBtn.style.display = 'block';
        moveBtn.style.visibility = 'visible';
        moveBtn.style.opacity = '1';
        moveBtn.disabled = false;
        console.log('[END_TURN] Start Move button shown, display:', moveBtn.style.display);
    }
    if (movementControls) movementControls.style.display = 'none';
    
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

// === NEW GAME FLOW FUNCTIONS ===

function showRollForTurnUI() {
    document.getElementById('turnOrderSection').style.display = 'block';
    document.getElementById('loadCitiesSection').style.display = 'none';
    document.getElementById('shipStatus').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
}

function rollForTurnOrder() {
    const roll = Math.floor(Math.random() * 6) + 1;
    gameState.turnOrderRolls[myPlayerIndex] = roll;
    
    // Track the order in which players roll (for tiebreaker - first roller wins ties)
    if (!gameState.rollOrder.includes(myPlayerIndex)) {
        gameState.rollOrder.push(myPlayerIndex);
    }
    
    log(`You rolled a ${roll} for turn order!`);
    document.getElementById('turnOrderResult').textContent = `You rolled: ${roll}`;
    document.getElementById('rollForTurnBtn').disabled = true;
    
    // Broadcast roll to other players
    sendWebSocketMessage({
        type: 'turn_order_roll',
        player_index: myPlayerIndex,
        roll: roll
    });
    
    // Check if all players have rolled
    checkTurnOrderComplete();
}

function checkTurnOrderComplete() {
    if (Object.keys(gameState.turnOrderRolls).length === gameState.players.length) {
        determineTurnOrder();
    }
}

function determineTurnOrder() {
    const rolls = Object.entries(gameState.turnOrderRolls).map(([idx, roll]) => ({
        playerIndex: parseInt(idx),
        roll: roll,
        // Get the position in rollOrder for tiebreaker (lower = rolled first)
        rollPosition: gameState.rollOrder.indexOf(parseInt(idx))
    }));
    
    // Sort by roll (descending), then by rollPosition (ascending - first roller wins ties)
    rolls.sort((a, b) => {
        if (b.roll !== a.roll) {
            return b.roll - a.roll; // Higher roll wins
        }
        return a.rollPosition - b.rollPosition; // First to roll wins ties
    });
    
    // Set turn order based on sorted rolls
    const turnOrder = rolls.map(r => r.playerIndex);
    gameState.currentPlayerIndex = turnOrder[0];
    
    // Check if there was a tie at the top
    const highestRoll = rolls[0].roll;
    const tiedPlayers = rolls.filter(r => r.roll === highestRoll);
    
    if (tiedPlayers.length > 1) {
        const winner = gameState.players[turnOrder[0]].name;
        log(`Tie at ${highestRoll}! ${winner} rolled first, so ${winner} goes first!`);
    }
    
    log(`Turn order determined: ${turnOrder.map(i => gameState.players[i].name).join(' → ')}`);
    log(`${gameState.players[gameState.currentPlayerIndex].name} goes first!`);
    
    // Start normal gameplay
    startNormalGameplay();
}

function loadCities() {
    const currentPlayer = gameState.players[myPlayerIndex];
    const citiesInput = document.getElementById('citiesInput');
    const cities = parseInt(citiesInput.value);
    
    // Calculate max available cities
    const citiesOnShip = currentPlayer.citiesOnShip || 0;
    const maxAvailable = Math.min(8, 10 - citiesOnShip);
    
    if (cities < 0 || cities > maxAvailable) {
        alert(`You must load between 0 and ${maxAvailable} cities!`);
        return;
    }
    
    // Update player's cities on ship
    currentPlayer.citiesOnShip = citiesOnShip + cities;
    currentPlayer.hasLoadedCities = true;
    currentPlayer.velocity = 9 - currentPlayer.citiesOnShip;
    
    log(`You loaded ${cities} ${cities === 1 ? 'city' : 'cities'}. Total on ship: ${currentPlayer.citiesOnShip}. Velocity: ${currentPlayer.velocity} light years per turn.`);
    
    // Broadcast to other players
    sendWebSocketMessage({
        type: 'cities_loaded',
        player_index: myPlayerIndex,
        cities: currentPlayer.citiesOnShip
    });
    
    // Hide city loading UI and show ship status
    document.getElementById('loadCitiesSection').style.display = 'none';
    document.getElementById('shipStatus').style.display = 'block';
    document.getElementById('citiesOnShip').textContent = currentPlayer.citiesOnShip;
    document.getElementById('currentVelocity').textContent = currentPlayer.velocity;
    
    // Show movement section with Start Move button and hide movement controls
    const movementSection = document.getElementById('movementSection');
    const moveBtn = document.getElementById('moveBtn');
    const movementControls = document.getElementById('movementControls');
    
    if (movementSection) {
        movementSection.style.display = 'block';
        movementSection.style.visibility = 'visible';
    }
    
    if (moveBtn) {
        moveBtn.style.display = 'block';
        moveBtn.style.visibility = 'visible';
        moveBtn.style.opacity = '1';
        moveBtn.disabled = false;
        console.log('[LOAD_CITIES] Start Move button shown, display:', moveBtn.style.display);
    }
    if (movementControls) movementControls.style.display = 'none';
    
    // Return to normal movement phase
    gameState.turnPhase = 'planning';
    
    log('Cities loaded! Click "Start Move" to begin moving your ship.');
    
    updateUI();
    drawBoard();
}

function startNormalGameplay() {
    console.log('[START_NORMAL] Starting normal gameplay...');
    gameState.turnPhase = 'planning';
    document.querySelector('.action-buttons').style.display = 'block';
    document.getElementById('turnOrderSection').style.display = 'none';
    
    // Show Start Move button, hide movement controls
    const moveBtn = document.getElementById('moveBtn');
    const movementControls = document.getElementById('movementControls');
    
    if (moveBtn) {
        moveBtn.style.display = 'block';
        console.log('[START_NORMAL] moveBtn shown');
    }
    if (movementControls) {
        movementControls.style.display = 'none';
    }
    
    // Check if current player is at home and needs to load cities for first time
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const homePlanet = HOME_PLANETS[currentPlayer.planet];
    const isAtHome = currentPlayer.position.q === homePlanet.q && currentPlayer.position.r === homePlanet.r;
    
    if (isAtHome && !currentPlayer.hasLoadedCities) {
        log('First turn! You must load cities before moving. Click "Start Move" to load cities.');
    } else {
        log('Game is now in progress. Click "Start Move" to move your ship!');
    }
    
    updateUI();
    drawBoard();
}

// Debug function to force show the button (can be called from console)
window.forceShowMoveButton = function() {
    const movementSection = document.getElementById('movementSection');
    const moveBtn = document.getElementById('moveBtn');
    const movementControls = document.getElementById('movementControls');
    
    console.log('[FORCE_SHOW] Movement section:', movementSection);
    console.log('[FORCE_SHOW] Move button:', moveBtn);
    
    if (movementSection) {
        movementSection.style.display = 'block';
        movementSection.style.visibility = 'visible';
        console.log('[FORCE_SHOW] Movement section shown');
    }
    
    if (moveBtn) {
        moveBtn.style.display = 'block';
        moveBtn.style.visibility = 'visible';
        moveBtn.style.opacity = '1';
        moveBtn.disabled = false;
        moveBtn.hidden = false;
        
        const computed = window.getComputedStyle(moveBtn);
        console.log('[FORCE_SHOW] Button display:', computed.display);
        console.log('[FORCE_SHOW] Button visibility:', computed.visibility);
        console.log('[FORCE_SHOW] Button is visible?', moveBtn.offsetParent !== null);
    }
    
    if (movementControls) {
        movementControls.style.display = 'none';
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initGame);


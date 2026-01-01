# Interstelliad - Space Colonization Game

A multiplayer web-based board game where players compete to colonize planets across the galaxy.

## Features

- **Real-time Multiplayer**: 2-4 players can join from different devices
- **WebSocket-powered**: Live updates for all players
- **Home Planet Selection**: Choose from Earth, Mars, Belt, or Jupiter
- **Strategic Gameplay**: 
  - Move ships between star systems
  - Check planets for intelligent life
  - Battle aliens or other players
  - Establish colonies

## Game Rules

### Setup
1. **Game Organizer** creates a game room and selects number of players (2-4)
2. Players join using the room code
3. Each player selects their unique home planet:
   - 🌍 **Earth** - In Sol system
   - 🔴 **Mars** - In Sol system
   - ☄️ **Belt** - In Sol system
   - 🪐 **Jupiter** - In Alpha Centauri system
4. Once all players join, organizer starts the game

### Gameplay
- **Movement**: Move up to 3 spaces per turn to adjacent star systems
- **Check for Life**: Roll 2 dice when reaching a planet
  - 7+ = Intelligent life present (must battle aliens)
  - 6 or less = Dead planet (can colonize freely)
- **Battle**: Roll 2 dice against opponent
  - Higher total wins
  - Ties require re-roll
- **Colonize**: Place one colony per turn (max 10 total)

### Scoring
Game ends when one player uses all 10 colony ships:
- **2 points** for colonies on planets with alien life
- **1 point** for colonies on dead planets

## Installation & Setup

### Prerequisites
- Python 3.8+
- pip

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Start the Server
```bash
python manage.py runserver
```

The game will be available at `http://127.0.0.1:8000/`

## How to Play

### For the Game Organizer:
1. Open `http://127.0.0.1:8000/` in your browser
2. Click **"Create New Game (Organizer)"**
3. Select the number of players
4. Share the **Room Code** with other players
5. Wait for all players to join
6. Click **"Start Game"** when ready

### For Players:
1. Open `http://127.0.0.1:8000/` in your browser
2. Click **"Join Existing Game (Player)"**
3. Enter the **Room Code** provided by the organizer
4. Enter your name
5. Choose your home planet
6. Click **"Join Game"**
7. Wait for the organizer to start

### During the Game:
- **Move Ship**: Click on an adjacent star system, then click "Move Ship"
- **Check for Life**: When at a new planet, click "Check for Life"
- **Colonize**: After checking for life (and winning any battles), click "Colonize"
- **End Turn**: Pass the turn to the next player

## Technology Stack

- **Backend**: Django 4.2 with Channels (WebSockets)
- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Real-time**: Django Channels with in-memory layer
- **Database**: SQLite (default)

## Architecture

```
interstelliad/
├── game/                    # Django app
│   ├── models.py           # GameRoom and Player models
│   ├── views.py            # HTTP endpoints
│   ├── consumers.py        # WebSocket handlers
│   ├── routing.py          # WebSocket URL routing
│   └── templates/          # HTML templates
├── static/                  # Static files
│   ├── css/
│   │   └── styles.css      # Game styling
│   └── js/
│       ├── game.js         # Game logic
│       └── websocket.js    # WebSocket handlers
├── interstelliad_project/   # Django project settings
└── manage.py               # Django management script
```

## Multiplayer Support

The game uses Django Channels with WebSockets to enable real-time multiplayer:

- **Room System**: Each game has a unique room code
- **Real-time Updates**: All players see moves instantly
- **Server-side Dice**: Dice rolls happen on the server for fairness
- **Turn Management**: Server coordinates whose turn it is

## Development

To modify the game:

1. **Frontend** (game logic, UI): Edit `static/js/game.js` and `static/css/styles.css`
2. **Backend** (WebSocket handlers): Edit `game/consumers.py`
3. **Models** (database): Edit `game/models.py` then run migrations
4. **Templates**: Edit `game/templates/game/index.html`

## Troubleshooting

### Port Already in Use
```bash
python manage.py runserver 8080
```

### WebSocket Connection Issues
- Ensure Django Channels is installed
- Check that Daphne is handling ASGI requests
- Verify WebSocket URL matches your domain

### Database Issues
```bash
rm db.sqlite3
python manage.py migrate
```

## Future Enhancements

- [ ] Redis backend for production (multiple server instances)
- [ ] Player authentication
- [ ] Game history and statistics
- [ ] Custom board configurations
- [ ] Mobile-responsive design
- [ ] Sound effects and animations

## License

MIT License - Feel free to modify and distribute!

## Credits

Original game concept: Interstelliad
Web implementation: 2026


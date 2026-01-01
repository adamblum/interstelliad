# How to Play Interstelliad with Friends on Your Network

## Quick Setup for Multiplayer

Your computer's local IP address is: **192.168.1.207**

### Step 1: Start the Server

From the project directory, run:

```bash
python3 manage.py runserver 0.0.0.0:8000
```

This makes the server accessible to other devices on your network.

### Step 2: Share the URL with Players

Give this URL to your friends:

```
http://192.168.1.207:8000
```

**Important:** All players must be on the **same WiFi network** as you.

### Step 3: Create and Join Game

**Organizer (You):**
1. Open `http://192.168.1.207:8000` in your browser
2. Click **"Create New Game (Organizer)"**
3. Select number of players
4. Share the **Room Code** that appears

**Players:**
1. Open `http://192.168.1.207:8000` in their browser
2. Click **"Join Existing Game (Player)"**
3. Enter the Room Code
4. Enter their name and choose a home planet
5. Click "Join Game"

**Start the Game:**
- Once all players have joined, the organizer clicks **"Start Game"**

---

## Troubleshooting

### "Can't connect" or "Page not loading"

1. **Check WiFi:** Make sure all devices are on the same network
2. **Check Firewall:** 
   - On Mac, go to System Preferences → Security & Privacy → Firewall
   - Allow Python to accept incoming connections
3. **Verify IP:** Your IP might change. Re-run this command:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
   ```

### Players can't connect via WebSocket

If players join but don't see real-time updates:
- Make sure the server is running with `0.0.0.0:8000` (not just `127.0.0.1`)
- Check that port 8000 is not blocked by your router's firewall

### Testing locally first

Before inviting friends, test with multiple browser tabs on your computer:
- Open `http://127.0.0.1:8000` in multiple tabs
- Create a game in one tab
- Join as a player in another tab

---

## Playing Over the Internet (Advanced)

To play with friends NOT on your network, you need:

1. **Port Forwarding** on your router (forward port 8000 to your computer)
2. **Your Public IP**: Find it at [whatismyipaddress.com](https://whatismyipaddress.com)
3. **Update ALLOWED_HOSTS**: Add your public IP to `settings.py`
4. **Security Warning**: This exposes your computer to the internet. Only do this temporarily and with friends you trust.

Better alternatives for internet play:
- Deploy to a cloud service (Heroku, Railway, DigitalOcean, AWS)
- Use ngrok for temporary tunneling: `ngrok http 8000`

---

## Example Play Session

```
Organizer creates game → Room Code: ABC123
Player 1 joins with code ABC123, chooses Earth
Player 2 joins with code ABC123, chooses Mars
Organizer starts game → Everyone plays together!
```

---

## Summary Commands

**Start server for network play:**
```bash
python3 manage.py runserver 0.0.0.0:8000
```

**Find your IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

**URL to share:**
```
http://192.168.1.207:8000
```

Have fun colonizing the galaxy! 🚀

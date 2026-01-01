# Exposing Interstelliad to the Public Internet

## Option 1: ngrok (Quickest - Recommended for Testing)

### What is ngrok?
ngrok creates a secure tunnel from a public URL to your local server. Perfect for quick sharing!

### Setup (5 minutes):

1. **Install ngrok:**
   ```bash
   # On Mac:
   brew install ngrok
   
   # Or download from: https://ngrok.com/download
   ```

2. **Sign up for free account:**
   - Go to https://ngrok.com/signup
   - Get your auth token from dashboard

3. **Configure ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

4. **Make sure your Django server is running:**
   ```bash
   python3 manage.py runserver
   ```

5. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 8000
   ```

6. **Update Django settings:**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Add it to your `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` in `settings.py`:
   
   ```python
   ALLOWED_HOSTS = ['*']  # or ['abc123.ngrok.io']
   
   CSRF_TRUSTED_ORIGINS = [
       'https://abc123.ngrok.io',
       'http://127.0.0.1:8000',
   ]
   ```

7. **Share the URL:**
   - Share `https://abc123.ngrok.io` with anyone in the world!
   - They can join your game from anywhere

### Pros:
✅ Super fast setup (5 minutes)
✅ HTTPS included
✅ Works behind firewalls
✅ Free tier available

### Cons:
❌ URL changes every time you restart ngrok (unless paid)
❌ Must keep your computer running
❌ Free tier has session limits

---

## Option 2: Cloudflare Tunnel (Free, More Permanent)

Similar to ngrok but with a more stable free tier.

### Setup:

1. **Install cloudflared:**
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Login:**
   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel:**
   ```bash
   cloudflared tunnel create interstelliad
   ```

4. **Run the tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:8000
   ```

5. **Get your public URL** and update Django settings

### Pros:
✅ Free forever
✅ More reliable than ngrok free
✅ Can use custom domain
✅ HTTPS included

### Cons:
❌ Still requires your computer to run
❌ Slightly more setup

---

## Option 3: Deploy to Railway (Free Cloud Hosting)

Deploy your app to the cloud so it runs 24/7 without your computer.

### Setup (15 minutes):

1. **Create a Railway account:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   # or: brew install railway
   ```

3. **Prepare your app:**

   Create `Procfile` in project root:
   ```
   web: daphne -b 0.0.0.0 -p $PORT interstelliad_project.asgi:application
   ```

   Create `railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "python manage.py migrate && daphne -b 0.0.0.0 -p $PORT interstelliad_project.asgi:application"
     }
   }
   ```

4. **Update settings.py for production:**
   ```python
   import os
   
   DEBUG = os.environ.get('DEBUG', 'False') == 'True'
   ALLOWED_HOSTS = ['*']
   
   # Use PostgreSQL on Railway
   if 'DATABASE_URL' in os.environ:
       import dj_database_url
       DATABASES = {
           'default': dj_database_url.config(
               conn_max_age=600,
               conn_health_checks=True,
           )
       }
   ```

5. **Add to requirements.txt:**
   ```
   dj-database-url
   psycopg2-binary
   gunicorn
   ```

6. **Deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

7. **Get your URL:**
   ```bash
   railway domain
   ```

### Pros:
✅ Runs 24/7 without your computer
✅ Free tier ($5/month credit)
✅ Automatic HTTPS
✅ Easy scaling
✅ Includes database

### Cons:
❌ Free tier has limits (500 hours/month)
❌ Requires some configuration

---

## Option 4: Deploy to Heroku

Similar to Railway but more established.

### Setup:

1. **Create Heroku account:** https://heroku.com

2. **Install Heroku CLI:**
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

3. **Prepare app:**
   
   Create `Procfile`:
   ```
   web: daphne -b 0.0.0.0 -p $PORT interstelliad_project.asgi:application
   ```
   
   Create `runtime.txt`:
   ```
   python-3.10.12
   ```

4. **Deploy:**
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   ```

### Pros:
✅ Very reliable
✅ Good documentation
✅ Automatic scaling

### Cons:
❌ No free tier anymore (starts at $5/month)
❌ Requires credit card

---

## Option 5: Deploy to Render (Free Cloud Alternative)

Free tier similar to Railway.

### Setup:

1. **Push code to GitHub** (if not already)

2. **Create account:** https://render.com

3. **Create new Web Service:**
   - Connect GitHub repo
   - Build command: `pip install -r requirements.txt && python manage.py migrate`
   - Start command: `daphne -b 0.0.0.0 -p $PORT interstelliad_project.asgi:application`

4. **Add environment variables:**
   - `DEBUG=False`
   - `SECRET_KEY=your-secret-key`

### Pros:
✅ True free tier (no credit card needed)
✅ Easy setup from GitHub
✅ Automatic deployments

### Cons:
❌ Free tier sleeps after inactivity
❌ Slower than paid tiers

---

## Option 6: DigitalOcean/AWS/GCP (Advanced)

Full VPS hosting for complete control.

### Setup:

1. **Create a VPS** ($5-10/month)
2. **SSH into server**
3. **Install dependencies**
4. **Configure nginx + systemd**
5. **Setup SSL with Let's Encrypt**

### Pros:
✅ Full control
✅ Best performance
✅ Can host multiple apps

### Cons:
❌ Most complex setup
❌ Requires server management skills
❌ Costs money

---

## Recommended Approach for Interstelliad:

### For Quick Testing/Demo:
**Use ngrok** - fastest way to share with friends right now

### For Permanent Public Access:
**Use Railway or Render** - free, reliable, runs 24/7

---

## Quick Start with ngrok (Do This Now):

```bash
# 1. Install ngrok
brew install ngrok

# 2. Sign up at ngrok.com and get your token

# 3. Configure
ngrok config add-authtoken YOUR_TOKEN

# 4. Make sure Django is running
python3 manage.py runserver

# 5. In new terminal, start ngrok
ngrok http 8000

# 6. Copy the https URL (e.g., https://abc123.ngrok.io)

# 7. Update settings.py:
# CSRF_TRUSTED_ORIGINS = ['https://abc123.ngrok.io']

# 8. Share the URL with anyone!
```

---

## Security Considerations:

When exposing to internet:
- ⚠️ Change `SECRET_KEY` in settings.py
- ⚠️ Set `DEBUG = False` in production
- ⚠️ Use environment variables for secrets
- ⚠️ Consider rate limiting for API endpoints
- ⚠️ Monitor for abuse

---

Would you like me to help you set up any of these options?

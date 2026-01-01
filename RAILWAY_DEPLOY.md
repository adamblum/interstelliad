# Railway Deployment Guide for Interstelliad

## Step-by-Step Instructions

### 1. Prepare Your Repository

First, make sure your code is in a Git repository:

```bash
cd /Users/adamblum/interstelliad
git add .
git commit -m "Prepare for Railway deployment"
```

If you haven't pushed to GitHub yet:
```bash
# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/interstelliad.git
git push -u origin main
```

### 2. Sign Up for Railway

1. Go to https://railway.app
2. Click "Login" and sign in with GitHub
3. Authorize Railway to access your GitHub account

### 3. Create New Project

1. Click "New Project" on Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your `interstelliad` repository
4. Railway will automatically detect it's a Python/Django app

### 4. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically set the DATABASE_URL environment variable

### 5. Add Redis (for WebSocket support)

1. Click "New" again
2. Select "Database" → "Add Redis"
3. Railway will automatically set the REDIS_URL environment variable

### 6. Configure Environment Variables

Click on your web service, go to "Variables" tab, and add:

```
DEBUG=False
SECRET_KEY=your-super-secret-key-here-change-this-to-something-random
RAILWAY_PUBLIC_DOMAIN=${{RAILWAY_PUBLIC_DOMAIN}}
```

To generate a secure SECRET_KEY, run:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 7. Deploy!

Railway will automatically:
1. Install dependencies from `requirements.txt`
2. Run migrations
3. Start the Daphne server
4. Assign you a public URL

### 8. Get Your Public URL

1. Go to your service's "Settings" tab
2. Click "Generate Domain" to get a public URL
3. Your game will be available at something like: `https://interstelliad-production.up.railway.app`

### 9. Update CORS Settings (if needed)

Once you have your Railway domain, the app will automatically add it to CSRF_TRUSTED_ORIGINS.

## Sharing Your Game

Once deployed, share your Railway URL with anyone:
```
https://YOUR-APP-NAME.up.railway.app
```

Players can:
1. Visit the URL
2. Create or join games
3. Play in real-time from anywhere in the world!

## Monitoring & Logs

- **View Logs**: Click on your service → "Deployments" → Click latest deployment
- **View Metrics**: Check CPU, Memory, and Network usage
- **Database**: Check your PostgreSQL database for game data

## Updating Your Game

To deploy updates:

```bash
git add .
git commit -m "Update game"
git push origin main
```

Railway will automatically redeploy!

## Costs

Railway free tier includes:
- $5 of usage per month
- Good for development and small games
- Upgrade if you need more resources

## Troubleshooting

### Build Failed
- Check the build logs in Railway dashboard
- Ensure all dependencies are in `requirements.txt`

### App Won't Start
- Check runtime logs
- Verify DATABASE_URL is set
- Make sure migrations ran successfully

### WebSocket Issues
- Ensure you're using `wss://` (not `ws://`) for production
- Check that Daphne is running (not Gunicorn)

### Static Files Not Loading
- Run `python manage.py collectstatic` locally to test
- Check STATIC_ROOT and STATICFILES_DIRS in settings.py
- Verify WhiteNoise is in MIDDLEWARE

## Alternative: One-Click Deploy

You can also add a Deploy to Railway button to your README:

```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/interstelliad)
```

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Django Channels Docs: https://channels.readthedocs.io

---

## Quick Commands Reference

```bash
# Commit changes
git add .
git commit -m "Your message"
git push origin main

# Generate secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Test locally
python manage.py runserver

# Test with production settings
DEBUG=False python manage.py runserver
```

Enjoy your deployed game! 🚀

# Viewing Logs and Debugging on Railway

## How to View Logs on Railway.app

### Method 1: Via Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Click on your `interstelliad` project

2. **View Deployment Logs**
   - Click on your **web service** (the one running your Django app)
   - Click on **"Deployments"** tab at the top
   - Click on the **latest deployment**
   - You'll see real-time logs showing:
     - Build process
     - Database migrations
     - Server startup
     - Any errors

3. **View Runtime Logs**
   - While on the deployment page, logs will stream in real-time
   - Look for error messages in **red**
   - Check for Python tracebacks

### Method 2: Via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   # or
   brew install railway
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Link Your Project**
   ```bash
   cd /Users/adamblum/interstelliad
   railway link
   ```

4. **View Logs**
   ```bash
   railway logs
   ```

---

## Common Errors and Fixes

### Error: "Failed to create game"

This usually means one of these issues:

#### 1. **Database Not Connected**
**Symptoms**: "relation 'game_gameroom' does not exist"

**Fix**:
- Ensure PostgreSQL is added to your Railway project
- Check that migrations ran successfully
- In Railway logs, look for: `python manage.py migrate`

**Manual Fix**:
```bash
railway run python manage.py migrate
```

#### 2. **Missing Environment Variables**
**Symptoms**: 500 errors, "SECRET_KEY not set"

**Fix**:
- Go to your service → Variables tab
- Add required variables:
  ```
  DEBUG=False
  SECRET_KEY=your-generated-secret-key
  ```

#### 3. **Static Files Not Loading**
**Symptoms**: CSS/JS not loading, blank page

**Fix**:
```bash
railway run python manage.py collectstatic --noinput
```

#### 4. **CSRF Token Errors**
**Symptoms**: "Forbidden (CSRF token missing)"

**Fix**: The app should auto-detect Railway domain, but verify:
- Check that `RAILWAY_PUBLIC_DOMAIN` is set
- View your domain in Settings → Networking

---

## Debugging Steps for "Failed to create game"

### Step 1: Check Railway Logs

Look for these specific errors:

**Database Connection Error:**
```
django.db.utils.OperationalError: could not connect to server
```
**Fix**: Add PostgreSQL database to project

**Migration Error:**
```
django.db.utils.ProgrammingError: relation "game_gameroom" does not exist
```
**Fix**: Run migrations manually

**CSRF Error:**
```
Forbidden (CSRF cookie not set.): /create-room/
```
**Fix**: Check CSRF_TRUSTED_ORIGINS includes your Railway domain

### Step 2: Test Locally First

Before debugging on Railway, test locally:

```bash
cd /Users/adamblum/interstelliad

# Start server
python3 manage.py runserver

# Open browser to http://127.0.0.1:8000
# Try creating a game
# Check terminal for errors
```

### Step 3: Check Browser Console

1. Open your Railway URL in browser
2. Press **F12** (or Cmd+Option+I on Mac) to open DevTools
3. Go to **Console** tab
4. Try creating a game
5. Look for JavaScript errors in red

### Step 4: Check Network Tab

1. In DevTools, go to **Network** tab
2. Try creating a game
3. Look for the `/create-room/` request
4. Click on it to see:
   - **Status code** (should be 200, if 403/500 = error)
   - **Response** tab (shows error message)
   - **Headers** tab (check CSRF tokens)

---

## Quick Fixes Checklist

### On Railway:

- [ ] PostgreSQL database added?
- [ ] Redis database added?
- [ ] Migrations ran successfully?
- [ ] Environment variables set (SECRET_KEY)?
- [ ] Domain generated?
- [ ] Deployment shows "Success"?

### Check Logs For:

```bash
# Good signs:
✓ "Applying migrations..."
✓ "Starting ASGI/Daphne"
✓ "System check identified no issues"

# Bad signs:
✗ "ModuleNotFoundError"
✗ "OperationalError"
✗ "relation does not exist"
✗ "CSRF verification failed"
```

---

## Railway CLI Commands Reference

```bash
# View logs
railway logs

# Run commands on Railway
railway run python manage.py migrate
railway run python manage.py createsuperuser
railway run python manage.py collectstatic

# SSH into your container (advanced)
railway shell

# Check environment variables
railway variables

# Restart service
railway up --detach
```

---

## Advanced Debugging

### Enable DEBUG Mode Temporarily

**Warning**: Only for debugging, never in production!

1. In Railway → Variables, set:
   ```
   DEBUG=True
   ```

2. Redeploy

3. Try creating game again - you'll see detailed error page

4. **Remember to set back to `DEBUG=False`** when done!

### View Database

1. In Railway, click on your **PostgreSQL** service
2. Go to **"Connect"** tab
3. Copy connection string
4. Use a tool like [pgAdmin](https://www.pgadmin.org/) or [TablePlus](https://tableplus.com/)
5. Check if tables exist:
   ```sql
   \dt game_*
   ```

---

## Common Solutions by Error Message

| Error Message | Solution |
|--------------|----------|
| "Failed to create game" | Check browser console for details |
| "CSRF token missing" | Verify CSRF_TRUSTED_ORIGINS |
| "Database connection failed" | Add PostgreSQL to project |
| "Module not found" | Check requirements.txt |
| "Static files not found" | Run collectstatic |
| "Port already in use" | Railway handles this automatically |

---

## Still Not Working?

### Share These Details:

1. **Railway deployment logs** (from Deployments tab)
2. **Browser console errors** (F12 → Console tab)
3. **Network request details** (F12 → Network → click /create-room/)
4. **Status code** from the failed request

### Get Help:

- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Django Channels Docs: https://channels.readthedocs.io

---

## Test Your Local Setup First

If Railway is confusing, test locally:

```bash
# Terminal 1: Start Django
python3 manage.py runserver 0.0.0.0:8000

# Terminal 2: Test with curl
curl -X POST http://localhost:8000/create-room/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "max_players=2"

# Should return: {"success": true, "room_code": "ABC123"}
```

---

Let me know what errors you see in the logs and I can help fix them!

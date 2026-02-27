# Deployment Guide

> ⚡ **If login is broken** (redirects back to landing page), jump to [Troubleshooting](#-troubleshooting) → "Login redirects back to landing page".

This repository contains a **React/Vite client** (`/client`) and an **Express/Socket.io backend** (`/server`).
The client is built as a static site and served separately (we use **Vercel**), while the backend runs as a persistent Node service with WebSocket support (we use **Render**).  Both services communicate over a REST/Socket API and require environment variables for configuration.

---

## 🌐 1. Prepare the GitHub Repository

1. Push the entire workspace to a public or private GitHub repository.
2. Ensure the root of the repo contains both `client/` and `server/` directories.

---

## 🔧 2. Backend (Render)

Render is a good match because it supports WebSockets without modification and exposes an HTTPS endpoint.

### a. Create a Web Service

1. Go to https://dashboard.render.com → **New** → **Web Service**.
2. Connect your GitHub repo and select the correct branch.
3. **Root directory**: `server` (important – Render will only build the server).
4. **Environment**: `Node 18` (or later).
5. **Build command**: leave blank or use `npm install` (dependencies are pulled automatically).
6. **Start command**: `npm start` (this runs `node server.js`).

### b. Set Environment Variables

Under the service's **Environment** tab add:

| Name                    | Value / Description                                 |
|-------------------------|-----------------------------------------------------|
| `MONGO_URI`            | MongoDB connection string (Atlas or Render DB).     |
| `SESSION_SECRET`       | Long random string for express-session cookie sign. |
| `GOOGLE_CLIENT_ID`     | OAuth2 client id from Google Cloud Console.         |
| `GOOGLE_CLIENT_SECRET` | Corresponding secret, keep private.                 |
| `FRONTEND_URL`         | **CRITICAL**: e.g. `https://myapp.vercel.app` (your deployed Vercel URL)  |
| `GOOGLE_CALLBACK_URL`  | (optional) full callback URL e.g. `https://whiteboard-backend.onrender.com/auth/google/callback` |
| `NODE_ENV`             | `production`                                       |

⚠️ **Critical: The `FRONTEND_URL` must match your Vercel deployment URL** – without it, users will be redirected to `localhost:5173` after Google login instead of your live site!

> ⚠️ **Do not commit any secrets** to Git. Manage them via the Render dashboard.

### c. Database Options

You can:

- Use your existing Atlas cluster (`MONGO_URI`), or
- Create a managed Mongo DB on Render and copy its URI.

### d. CORS / Redirects

The server already reads `process.env.FRONTEND_URL` and includes it in `allowedOrigins`.  When you know the final Vercel domain, add it to the environment variable so the API will accept requests and redirect correctly after Google login.

### e. Validate

After a successful deploy you will have a URL like `https://whiteboard-backend.onrender.com`.  

- Open it in a browser – you should see JSON: `{"message":"Whiteboard Server is Running"}`
- Try the health endpoint: `https://whiteboard-backend.onrender.com/health` → `{"ok":true}`
- Try the API: `https://whiteboard-backend.onrender.com/api/rooms` → should return a JSON array (may need to run client first to create rooms)

If you see the **frontend HTML** appearing instead of JSON, your FRONTEND_URL is likely still being served from the old build. **Redeploy** after setting `FRONTEND_URL`.

---

## ⚡ 3. Frontend (Vercel)

Vercel builds the React app and serves the output from `/client/dist`.

### a. Create a New Project

1. Visit https://vercel.com/new and import the same GitHub repository.
2. Set the **Framework Preset** to `Vite` (it should detect automatically).
3. **Root Directory**: `client` (important!).
4. **Build Command**: `npm run build` (already defined).
5. **Output Directory**: `dist`.

### b. Environment Variables

In the Vercel dashboard for your project add:

| Name               | Value                                           |
|--------------------|-------------------------------------------------|
| `VITE_BACKEND_URL` | the Render URL from the previous step          |

`VITE_` prefix is required by Vite so that the variable is exposed to the client bundle.

> You may also set `VITE_GOOGLE_CLIENT_ID` or others if you read them directly from the client – currently, the app constructs the login URL on the server.

### c. vercel.json

A basic rewrite is already included at `client/vercel.json` so that all paths serve `index.html` (history API fallback).  No additional changes are needed unless you want custom domains or headers.

### d. Deploy

Hit **Deploy**.  When the build finishes you will have a public URL such as `https://myapp.vercel.app`.

### e. Finalize CORS/Callback

1. **Copy your Vercel URL** and add it to Render's `FRONTEND_URL` environment variable (if not done already).  
   Re-deploy the Render service so it reads the updated env var.

2. **Update Google Cloud OAuth Credentials**  
   - Go to https://console.cloud.google.com → APIs & Services → Credentials
   - Click the OAuth 2.0 Client ID you're using
   - Add to **Authorized JavaScript origins**:
     ```
     https://myapp.vercel.app
     https://myapp.vercel.app:443
     ```
   - Add to **Authorized redirect URIs**:
     ```
     https://whiteboard-backend.onrender.com/auth/google/callback
     ```
   - Click **Save**
   - ⚠️ Changes can take a few minutes to propagate.

3. **Verify the flow**  
   - Open your Vercel URL in a new incognito/private window.
   - Click **Continue with Google**.
   - After login, you should be redirected to the home dashboard, not back to landing.
   - Check browser's Network tab – requests to `/api/rooms` should return 200 and WebSocket should connect.

---

## � Troubleshooting

### Problem: "Backend is showing the frontend / visiting backend URL shows HTML"

**Cause**: The backend's static file serving is trying to serve `../client/dist` which doesn't exist in Render.

**Fix**: This should be resolved by the latest code. The server now checks if the `client/dist` folder exists:
- If it exists (monolith deployment), it serves the client.
- If it doesn't exist (separate Vercel + Render), it returns JSON only.

Make sure you've pulled the latest server code and **redeployed** on Render.

### Problem: "I'm logged in locally but after clicking 'Login' on the deployed site, it redirects back to landing page"

**Cause**: One or more of these:
1. `FRONTEND_URL` environment variable is not set or wrong.
2. Google OAuth callback URL doesn't match what's registered in Google Cloud Console.
3. Cookies are being blocked due to SameSite policy or non-HTTPS origin in Google Console.

**Fixes**:

1. **Check `FRONTEND_URL` is set correctly in Render**  
   In Render dashboard → your service → Environment:
   - Copy the exact Vercel URL (e.g., `https://myapp.vercel.app`)
   - Verify the value matches – no typos, trailing slashes, or http:// prefix.

2. **Update Google Cloud Console OAuth settings**  
   - Go to https://console.cloud.google.com → APIs & Services → Credentials
   - Edit the OAuth 2.0 Client ID you're using
   - Under "Authorized redirect URIs" add the exact callback URL:
     ```
     https://whiteboard-backend.onrender.com/auth/google/callback
     ```
   - Under "Authorized JavaScript origins" add:
     ```
     https://myapp.vercel.app
     ```
   - Save and wait a few minutes for changes to propagate.

3. **Check server logs**  
   - In Render dashboard, look at the Web Service logs (tail view).
   - You should see `[Auth] Google callback triggered, will redirect to: https://myapp.vercel.app`
   - If you see `localhost:5173` instead, then `FRONTEND_URL` is not being read – double-check it's in the environment.

4. **Test the auth flow manually**  
   - Open `https://myapp.vercel.app/login` and click "Continue with Google".
   - After approval, Google redirects to the backend callback.
   - Check the Render logs to see if `[Auth] User authenticated & session created:` appears.

### Problem: "Network requests to backend are failing with CORS errors"

**Cause**: The backend's `allowedOrigins` doesn't include your Vercel URL.

**Fix**: Ensure `FRONTEND_URL` is set in Render and matches your Vercel deployment exactly (including trailing slashes and protocol). Redeploy the backend after updating the environment variable.

- **Backend**: from repo root run `cd server && npm install && npm run dev`.  Edit `.env` with local equivalents.
- **Frontend**: `cd client && npm install && npm run dev`.
- If you run both locally, the front end reads `VITE_BACKEND_URL` or falls back to `http://localhost:5000` so things work automatically.

---

## 📦 Production Adjustments (already applied)

- **Backend now checks if deployed separately** – When `client/dist` doesn't exist (Render deployment), it runs in API-only mode, not serving frontend files.
- **Auth callback fixed** – Backend logs redemption steps and respects `FRONTEND_URL` env var for proper redirects.
- **Google Passport proxy mode** – Added `proxy: true` and support for `GOOGLE_CALLBACK_URL` env var to handle reverse proxies.
- **Client everywhere uses env vars** – All pages (`Home.jsx`, `Login.jsx`, `AuthContext.jsx`, `Whiteboard.jsx`) use `import.meta.env.VITE_BACKEND_URL || fallback` instead of hardcoding `localhost:5000`.

These changes make the app portable across hosting providers without code changes.

---

## ✅ Checklist before going live

1. [ ] Pull latest code (includes backend API-only mode fix and auth improvements).
2. [ ] `FRONTEND_URL` is set in Render environment to your exact Vercel URL (e.g., `https://myapp.vercel.app`).
3. [ ] Backend is redeployed after setting `FRONTEND_URL`.
4. [ ] Google OAuth: Authorized redirect URIs include `https://whiteboard-backend.onrender.com/auth/google/callback`.
5. [ ] Google OAuth: Authorized JavaScript origins include your Vercel URL.
6. [ ] MongoDB access list allows connections from Render.
7. [ ] Browser Network tab shows 200 responses on `/api/rooms` and `wss://` upgrade for WebSocket.

Once everything passes, open your Vercel URL in an incognito window, click **Continue with Google**, and verify you land on the dashboard (not back at landing).

---

💡 **Tip**: if you ever move to a single service (e.g., Vercel serverless functions), you can merge the `server` code into `client/api` and adjust accordingly.  For now the split keeps realtime sockets simple.

Good luck with your deployment! Let me know if you need help configuring DNS, SSL, or scaling.
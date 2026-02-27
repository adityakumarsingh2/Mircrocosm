# Deployment Guide

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
3. **Root directory**: `server` (otherwise Render will try to build the client).
4. **Environment**: `Node 18` (or later).
5. **Build command**: leave blank (we only run dependencies).
6. **Start command**: `npm start` (this runs `node server.js`).

### b. Set Environment Variables

Under the service's **Environment** tab add:

| Name                    | Description / Example value                         |
|-------------------------|-----------------------------------------------------|
| `PORT`                 | (optional) Render will set this automatically       |
| `MONGO_URI`            | MongoDB connection string (Atlas or Render DB).     |
| `SESSION_SECRET`       | Long random string for express-session cookie sign. |
| `GOOGLE_CLIENT_ID`     | OAuth2 client id from Google Cloud Console.         |
| `GOOGLE_CLIENT_SECRET` | Corresponding secret, keep private.                 |
| `FRONTEND_URL`         | e.g. `https://myapp.vercel.app` (set later).       |
| `NODE_ENV`             | `production`                                       |

> ⚠️ **Do not commit any secrets** to Git. Manage them via the Render dashboard.

### c. Database Options

You can:

- Use your existing Atlas cluster (`MONGO_URI`), or
- Create a managed Mongo DB on Render and copy its URI.

### d. CORS / Redirects

The server already reads `process.env.FRONTEND_URL` and includes it in `allowedOrigins`.  When you know the final Vercel domain, add it to the environment variable so the API will accept requests and redirect correctly after Google login.

### e. Validate

After a successful deploy you will have a URL like `https://whiteboard-backend.onrender.com`.  Open it in a browser – you should see `Whiteboard Server is Running`.

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

Copy the Vercel URL and paste it into the Render service’s `FRONTEND_URL` environment variable.  Also update your OAuth credentials in Google Cloud Console to include:

- Authorized JavaScript origins: `https://myapp.vercel.app`
- Authorized redirect URIs: `https://whiteboard-backend.onrender.com/auth/google/callback`

Re‑deploy the backend if you change `FRONTEND_URL`.

---

## 🛠️ 4. Local Development Notes

- **Backend**: from repo root run `cd server && npm install && npm run dev`.  Edit `.env` with local equivalents.
- **Frontend**: `cd client && npm install && npm run dev`.
- If you run both locally, the front end reads `VITE_BACKEND_URL` or falls back to `http://localhost:5000` so things work automatically.

---

## 📦 Production Adjustments (already applied)

- Client now uses `import.meta.env.VITE_BACKEND_URL` everywhere instead of hardcoded `localhost:5000`.
- Auth route in the backend respects `FRONTEND_URL` environment variable for redirects.
- CORS configuration checks `process.env.NODE_ENV` and includes the dynamic frontend URL.

These changes make the codebase portable across hosting providers.

---

## ✅ Checklist before going live

1. [ ] All secret environment variables are defined in Render/Vercel.
2. [ ] Google OAuth credentials updated with production URI.
3. [ ] MongoDB access list allows connections from Render.
4. [ ] Frontend is built on Vercel and can hit the backend (`Network` tab → 200 on `/api/rooms`).
5. [ ] WebSocket connections succeed (`ws://` should upgrade to `wss://`).

Once everything passes, share the Vercel URL with users!

---

💡 **Tip**: if you ever move to a single service (e.g., Vercel serverless functions), you can merge the `server` code into `client/api` and adjust accordingly.  For now the split keeps realtime sockets simple.

Good luck with your deployment! Let me know if you need help configuring DNS, SSL, or scaling.
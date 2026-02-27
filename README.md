# Collaborative Whiteboard Capstone

This repository contains a real-time collaborative whiteboard application built with:

- **Frontend**: React 18, Vite, Socket.io-client, Tailwind-like inline styling
- **Backend**: Node/Express, Socket.io, MongoDB, Passport (Google OAuth)

The server persists room metadata (pages, host username) and mediates WebRTC signaling for video/audio/screen sharing.  The client manages UI, drawing canvas, user lists, chat and theme.

## Folder structure

```
client/          # React/Vite application
server/          # Express + WebSocket API
```

See `DEPLOYMENT.md` for instructions on deploying the app to **Vercel (frontend)** and **Render (backend)**.  The client is also runnable locally with `npm run dev` and the server with `npm start`.

## Quick start

```bash
# backend
cd server && npm install
npm run dev

# frontend (in another terminal)
cd client && npm install
npm run dev
```

## Environment variables

Each service has its own `.env` conventions:

- **server/.env** (see `server/.env.example` for a template). Key names include `MONGO_URI`,
  `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `FRONTEND_URL`.

- **client** uses Vite's `VITE_BACKEND_URL`.  Create a file such as
  `client/.env.local` or define `VITE_BACKEND_URL` in your hosting provider (Vercel
  environment variables will be automatically injected).

During local development you can copy the `.example` files and fill them with
`localhost` values; do **not** commit your real credentials.

---

Written by *your name* as part of Node.js exam preparation.
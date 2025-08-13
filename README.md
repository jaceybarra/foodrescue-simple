# FoodRescueSimple (MVP)

Lean coordination app to match surplus food pickups with local drivers/charities. 
Built for fast local pilots. Runs fully on your machine.

## Features (MVP)
- Create pickup jobs (title, location, food type, contact, expiry window)
- Driver list & claim
- Status flow: **open → claimed → en_route → picked_up → delivered**
- Photo proof upload
- Simple dashboard + CSV export
- No external DB needed (SQLite file)
- Optional SMS hooks (Twilio) — disabled by default

## Tech
- Backend: Node/Express + SQLite (file DB), Multer for uploads
- Frontend: Vite + React
- Dev UX: single `npm run dev` launches server and client

## Quickstart
```bash
cd FoodRescueSimple
cp .env.sample .env
npm install
npm run dev
```
- API server on http://localhost:5000
- Frontend on http://localhost:5173 (auto-proxies /api to server)

## Build & Run (prod-ish)
```bash
npm run build
npm start
```
This serves the built React app from Express at http://localhost:5000

## File Uploads
Saved to `/uploads/` by default. In production, swap to S3/GCS.

## Data Persistence
The SQLite DB file `data.db` is created in the project root. To reset, delete it.

## Notes
- This is a **functional MVP** intended for pilot testing.
- Add auth before real deployments (e.g., Clerk/Auth0 or passwordless magic links).
- Tailwind/UI kits can be layered later; current UI is clean and lightweight vanilla CSS.

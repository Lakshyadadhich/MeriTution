# Sharma Tuition Classes

A private, mobile-first tuition administration app for Sharma Tuition Classes. It covers student records, batches, monthly fees, payments and daily attendance, with Excel exports and a full JSON backup.

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, installable PWA
- **Backend:** Node.js 20, Express 4, Mongoose 8, MongoDB Atlas
- **Money:** stored as integer paise, displayed in INR
- **Timezone:** Asia/Kolkata

## Project structure

```
backend/    REST API, MongoDB models, scripts, acceptance tests
frontend/   React SPA + PWA assets (builds to frontend/dist)
```

The backend serves `frontend/dist` automatically when it exists, so production is a single Node process on one port.

## Prerequisites

- Node.js 20+ and npm
- A MongoDB Atlas cluster (or local MongoDB)

## 1. Backend setup

```powershell
cd backend
npm install
```

Edit `backend/.env` and set at least:

```ini
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/tuition_manager?retryWrites=true&w=majority
JWT_SECRET=<a long random string>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe@123
```

All variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | API port | `5000` |
| `MONGODB_URI` | MongoDB connection string | — (required) |
| `JWT_SECRET` | Signs the auth cookie | — (required in production) |
| `JWT_EXPIRES_IN` | Session lifetime | `7d` |
| `COOKIE_SECURE` | Set `true` behind HTTPS | `false` |
| `CLIENT_ORIGIN` | Allowed frontend origin(s), comma separated | `http://localhost:5173` |
| `ADMIN_NAME` | First admin display name | `Sharma Tuition Administrator` |
| `ADMIN_EMAIL` | First admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | First admin password | — |
| `TIMEZONE` | Reporting timezone | `Asia/Kolkata` |

Create the administrator (or let the server create it on first boot when no user exists):

```powershell
npm run seed:admin
```

Start the API:

```powershell
npm run dev
```

Health check: `http://localhost:5000/api/health`

## 2. Frontend setup

```powershell
cd frontend
npm install
```

`frontend/.env`:

```ini
VITE_API_URL=http://localhost:5000/api
```

Run the dev server:

```powershell
npm run dev
```

Open `http://localhost:5173` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 3. Production build

```powershell
cd frontend
npm run build
cd ../backend
$env:NODE_ENV="production"
npm start
```

Open `http://localhost:5000`. For deployment, set `COOKIE_SECURE=true`, `CLIENT_ORIGIN` to the public URL, a strong `JWT_SECRET`, and serve over HTTPS.

## Deploy on Vercel (Services)

`vercel.json` deploys the repository as one Vercel project with two services:

| Service | Root | Public path | Framework |
| --- | --- | --- | --- |
| `frontend` | `frontend/` | `/` | Vite |
| `backend` | `backend/` | `/api/*` | Express |

The backend is public only under `/api`. The SPA calls that same-origin path, so no service binding is used: bindings inject URLs into server-side runtime code, not into a static browser build. The Express service exports the app for Vercel and connects to MongoDB (and creates the admin when the users collection is empty) on the first API request.

Vercel project settings:

- Leave the root directory at the repository root; Vercel reads `vercel.json` and builds both services.
- Add these environment variables: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `COOKIE_SECURE=true`, `CLIENT_ORIGIN=https://<your-project>.vercel.app`, and optionally `TIMEZONE`.
- Do not set `VITE_API_URL`; `frontend/.env.production` builds the app against the same-origin `/api` path.
- In MongoDB Atlas, allow Vercel's egress (for example `0.0.0.0/0`, or Vercel Secure Compute static IPs), because Vercel Function IPs are not fixed.

Run both services locally with `vercel dev` from the repository root.

## Features

- **Dashboard:** active students, today's attendance, monthly collection, outstanding fees, pending fees, recent students.
- **Students:** search, grade/batch/status filters, duplicate contact warnings, profile with fee, payment and attendance history, activate/deactivate.
- **Batches:** timings, weekdays, supported grades, active/inactive, student list.
- **Attendance:** per batch and date, present/absent/leave, mark-all-present, correction of past dates.
- **Fees:** monthly generation for active students, status filters, discounts and due-date adjustments.
- **Payments:** cash/UPI/bank/other, partial payments, printable receipt, reversal with reason and balance recalculation.
- **Reports:** fee summary, outstanding dues, attendance percentage, collection by month and mode.
- **Exports:** students, fees, payments and attendance as `.xlsx`; full JSON backup.
- **PWA:** installable, app-shell caching, API always network-only.

## Tests

```powershell
cd backend
npm test
```

The acceptance suite uses `mongodb-memory-server`, so no Atlas connection is needed.

## Restore a backup

```powershell
cd backend
npm run restore -- path\to\sharma-tuition-backup.json
```

Add `--drop` to clear existing collections first.

## Security notes

- Change `ADMIN_PASSWORD` before the first production start; the admin is only auto-created when the users collection is empty.
- Use a long random `JWT_SECRET`; sessions are HttpOnly cookies.
- Login is rate-limited and all API inputs are validated with Zod.
- Payment reversals are retained for audit; original receipts are never deleted.

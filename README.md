# JSL FastLine

**Offline-first social learning platform** built for low-connectivity environments. Post, learn, and sync when you're back online.

## Features

- **Offline-first**: Create posts, join groups, use AI—data syncs when online
- **AI assistant**: Hybrid mode (offline fallback + online when connected)
- **Study groups**: Create and join groups, share resources
- **PWA**: Installable, works offline with service worker
- **Phone-based auth**: Register/login with phone + username

## Tech stack

- **Frontend**: React 19, Vite, Tailwind CSS, Dexie (IndexedDB), React Router
- **Backend**: Node.js, Express, Mongoose (MongoDB), Redis (optional), Socket.io
- **Sync**: Custom offline-first sync with conflict handling

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI (required), JWT_SECRET (required), REDIS_URL (optional)
npm install
npm run dev
```

Backend runs at `http://localhost:5000`. Health: `GET /health`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Optional: set VITE_API_URL=http://localhost:5000/api (default) or use proxy with VITE_API_URL=/api
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. With proxy (see `vite.config.js`), use `VITE_API_URL=/api` so API calls go through the dev server.

### 3. Environment

**Backend (`.env`):**

| Variable       | Required | Description                    |
|----------------|----------|--------------------------------|
| MONGODB_URI    | Yes      | MongoDB connection string      |
| JWT_SECRET     | Yes      | Secret for JWT signing         |
| REDIS_URL      | No       | Redis URL (in-memory stub used if missing) |
| PORT           | No       | Default 5000                   |
| CORS_ORIGIN    | No       | Comma-separated origins        |

**Frontend (`.env`):**

| Variable       | Description                    |
|----------------|--------------------------------|
| VITE_API_URL   | API base URL (e.g. `http://localhost:5000/api` or `/api` with proxy) |

## Scripts

- **Backend**: `npm run dev` (nodemon), `npm start`
- **Frontend**: `npm run dev`, `npm run build`, `npm run preview`

## Project layout

```
jsl-fastline/
├── backend/           # Express API
│   ├── src/
│   │   ├── middleware/  # auth, rateLimit
│   │   ├── models/      # User, Post, Group
│   │   ├── routes/      # auth, posts, groups, sync
│   │   ├── redis.js
│   │   └── server.js
│   └── .env.example
├── frontend/          # React + Vite
│   ├── public/        # offline.html, manifest.json, sw.js
│   ├── src/
│   │   ├── api/       # api client
│   │   ├── components/
│   │   ├── contexts/  # Auth, Network, Sync
│   │   ├── offline/   # Dexie DB
│   │   └── pages/
│   └── .env.example
└── README.md
```

## API overview

- `POST /api/auth/register` – phone, username
- `POST /api/auth/login` – phone
- `GET/POST /api/posts` – posts (auth)
- `GET/POST /api/groups` – groups (auth)
- `POST /api/groups/:id/join` – join group
- `POST /api/ai` – AI query (body: `{ query, mode }`)
- `POST /api/sync/*` – offline sync

## License

ISC

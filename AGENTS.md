# Base44 Dev Environment

## Stack
- **Frontend**: Create React App (`react-scripts` 5.0.1) + CRACO + Tailwind, in `frontend/`. Dev server on port 3000 (`npm start` → `craco start`). Uses `REACT_APP_BACKEND_URL` (absolute) to call the backend API.
- **Backend**: FastAPI + Uvicorn in `backend/`, entrypoint `server:app`. MongoDB via `motor`. JWT bearer auth (no cookies). Runs on port 8000 with `--reload`.
- **DB**: MongoDB 7 (compose service `mongodb`), credentials generated inline in compose.

## Running
```
docker compose -f docker-compose.base44.yml up -d --build
```
- Frontend: http://localhost:3000 (preview). Backend: http://localhost:8000 (public: `https://8000-$BASE44_PUBLIC_HOST_SUFFIX`).
- Healthchecks: backend → `GET /api/app-settings` (unauthenticated, touches DB); frontend → `GET /` on the dev server.

## Required env (all satisfied locally — NO external credentials needed)
- `MONGO_URL`, `DB_NAME` — wired from the local `mongodb` compose service.
- `JWT_SECRET` — has a code default; set explicitly in compose.
- `SUB_ADMIN_USERNAME` / `SUB_ADMIN_PASSWORD` — optional; only seeds the substitution admin if both present.
- `OPENAI_API_KEY` is **not** required: `from openai import AsyncOpenAI` is an unused import, never instantiated.

## Quirks / gotchas
- **`npm install` must NOT use `--legacy-peer-deps`.** With that flag, npm hoists `ajv` v6 to the top level and `ajv-keywords` crashes at boot with `Cannot find module 'ajv/dist/compile/codegen'`. Plain `npm install` resolves `ajv` 8.20.0 and works. The frontend installs at container startup into the bind-mounted `frontend/node_modules` (gitignored, persists on host).
- **`emergentintegrations==0.1.0` was removed from `backend/requirements.txt`** — it is not on PyPI and is not imported anywhere in the app (only test files reference an `emergentagent.com` host URL). Re-add only if a real dependency on it appears.
- **Host check**: CRA dev server needs `DANGEROUSLY_DISABLE_HOST_CHECK=true` (set in compose) so the preview's sandbox Host header isn't rejected. `DISABLE_VISUAL_EDITS=true` skips the CRACO visual-edits plugin.
- **Hardcoded upload path**: `backend/server.py` uses `UPLOADS_DIR = Path("/app/backend/uploads")`, so the backend source must be mounted at `/app/backend` (it is).
- Backend `CORS` allows `*` with credentials; auth is via `Authorization: Bearer <jwt>`, so separate origins (frontend 3000 ↔ backend 8000) works without cookies.

## Admin login (seeded on first boot)
- Username `admin`, password `teacher123` (role: admin).

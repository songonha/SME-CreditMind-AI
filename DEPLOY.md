# Deploy & runtime notes (VER02 / demo)

This document complements [README.md](./README.md). Use it for **class demos, GCP, and whoever clones the repo** so ports and commands stay consistent.

## Git branches

| Branch | Purpose |
|--------|---------|
| `main` | Team default / stable baseline. |
| `VER02` | **Demo line** — bank-ready features, English UI, billing, ports tuned for Windows dev. Keeps demo work separate from `main` until the team merges. |

Upstream example: [songonha/SME-CreditMind-AI @ VER02](https://github.com/songonha/SME-CreditMind-AI/tree/VER02).

### Clone and work on VER02

```bash
git clone https://github.com/songonha/SME-CreditMind-AI.git
cd SME-CreditMind-AI
git fetch origin
git checkout VER02
```

Push local demo commits to the remote branch:

```bash
git push origin VER02
```

Optional: after a stable demo, open a **Pull Request** `VER02` → `main` when the team agrees.

---

## Local ports (do not mix these up)

| Environment | Command | API listens on | Next.js rewrite target (`BACKEND_INTERNAL_ORIGIN` in `sme-creditmind-ai/.env.local`) |
|-------------|---------|----------------|--------------------------------------------------------------------------------------|
| **Windows** | `npm run dev:win` from repo root | **8012** (`CREDITMIND_PORT` set by npm) | `http://127.0.0.1:8012` (matches default in `next.config.ts` / `.env.example`) |
| **macOS / Linux** | `npm run dev` | **8008** (`run.py` default) | `http://127.0.0.1:8008` |
| **Manual backend** | `cd sme-creditmind-ai-backend && python run.py` (no env) | **8008** | Set `BACKEND_INTERNAL_ORIGIN` to `http://127.0.0.1:8008` |
| **Docker Compose** | `docker compose up --build` | **8008** inside stack | As defined in compose / internal service URL |

Frontend is always **`http://127.0.0.1:3000`** for local dev scripts above.

If the Billing page shows **404** on `/api/subscription/*`, the UI proxy is hitting the **wrong process or port** — align `BACKEND_INTERNAL_ORIGIN` with the uvicorn port and restart.

---

## GCP / Cloud Run (outline)

1. Build and deploy **backend**; set secrets (e.g. Secret Manager): `CREDITMIND_JWT_SECRET_KEY`, `CREDITMIND_DATABASE_URL` (Cloud SQL), AI keys.
2. Run **`alembic upgrade head`** once before serving traffic (job or init container).
3. Deploy **frontend**; set:
   - `BACKEND_INTERNAL_ORIGIN` to the **reachable API base URL** (internal LB or public URL, depending on architecture), **or**
   - `NEXT_PUBLIC_API_URL` to the public API URL if the browser calls the API directly (enable CORS on FastAPI).
4. Health check: `GET /api/health`.
5. Subscription / quotas (if enabled on this branch): `GET /api/subscription/plans` requires auth; verify routes exist in `/docs` on the deployed API.

---

## Version label

Team convention: **VER02** branch = version-2 demo line. Optionally add a **Git tag** (e.g. `V02`) on the commit you show judges — tags are immutable pointers and do not delete history.

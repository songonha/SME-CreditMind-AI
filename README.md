# SME CreditMind AI

**AI-driven SME credit assessment from POS data**  
Built for **Shinhan Bank Vietnam x Qwen AI Build Day (SB09)**.

---

## 1) Project Snapshot

SME CreditMind AI is a two-tier MVP that helps loan officers assess SME creditworthiness using POS transaction evidence.

- Frontend: `Next.js` dashboard for portfolio monitoring, merchant analysis, POS capture workflow, and AI co-pilot.
- Backend: `FastAPI` service for merchant APIs, scoring logic, AI orchestration, multi-tenant auth, quotas, and health checks.
- Data layer: `SQLAlchemy` targeting **SQLite** (local default) or **PostgreSQL** (Docker / production). Alembic migrations live in `sme-creditmind-ai-backend/alembic/`.

This README is aligned with the **current codebase implementation** (bank-ready multi-tenant release **v2.0.0**).

### Branches

- **`main`** — default stable line for the team.
- **`VER02`** — **demo branch** (bank demo, English UI, billing, Windows-friendly dev ports). Keeps demo snapshots separate from `main` until you merge. Example: [songonha/SME-CreditMind-AI @ VER02](https://github.com/songonha/SME-CreditMind-AI/tree/VER02).
- **Ports, GCP, and clone/push commands for VER02:** see **[DEPLOY.md](./DEPLOY.md)**.

---

## 2) Current Architecture (Implemented)

```text
Next.js (sme-creditmind-ai)  --->  FastAPI (sme-creditmind-ai-backend)  --->  SQLite or PostgreSQL
         |                                  |                              + organizations / users / RBAC
         |                                  +--> JWT auth + org scope (X-Organization-Id)
         |                                  +--> Entitlements + AI usage / paid reports
         |                                  +--> Scoring Engine (pandas/numpy)
         |                                  +--> AI Orchestrator (Qwen/OpenAI compatible API)
         +--> Live POS Capture (browser localStorage)
```

Key runtime behavior:

- Root **`npm run dev`** (macOS/Linux): frontend **`3000`**, backend **`8008`**.
- Root **`npm run dev:win`** (Windows): frontend **`3000`**, backend **`8012`** (see [DEPLOY.md](./DEPLOY.md) and `CREDITMIND_PORT` in `package.json`).
- **Authenticated API calls** send `Authorization: Bearer <access_token>` and `X-Organization-Id: <org id>` (see login + session storage). Leave `NEXT_PUBLIC_API_URL` empty to use same-origin `/api/...` rewrites to FastAPI in dev.
- Backend ensures tables exist on startup **and** Docker/Cloud entrypoints run **`alembic upgrade head`** before `uvicorn`. Subscription plan rows are bootstrapped on startup.

---

## 3) Tech Stack

### Frontend

- `Next.js 16` + `React 19` + `TypeScript`
- `Tailwind CSS 4`
- `Recharts` for visualization
- Custom UI components under `src/components`

### Backend

- `FastAPI` + `uvicorn`
- `SQLAlchemy 2` + `Pydantic`
- `pandas` + `numpy` scoring pipeline
- `httpx` for AI provider calls

### AI Providers

- Primary-ready path: `Qwen` (`CREDITMIND_QWEN_*`)
- Optional fallback: `OpenAI-compatible` (`CREDITMIND_OPENAI_*`)

---

## 4) Feature Inventory (Code-Verified)

### Luồng nhân viên gợi ý (UI)

1. Đăng nhập → **Dashboard**, xem **Ưu tiên hôm nay** (cảnh báo mức cao, hồ sơ REVIEW, loan case mở).
2. Mở **Merchants** hoặc `/merchants?filter=review` để tập trung SME cần xem xét.
3. Vào chi tiết merchant: **Tiến độ hồ sơ**, liên kết nhanh **Nhập POS** / **Đánh giá AI** / **Chụp chứng từ**.
4. Dùng **POS data upload** và **New Assessment** với `?merchantId=` để khỏi chọn lại SME trong dropdown.
5. Ghi nhận quyết định (loan case) trên trang merchant; theo dõi danh sách tại **`/loan-queue`**.

**Query thường dùng**

| Trang | Query | Ý nghĩa |
|--------|--------|---------|
| `/transaction-upload` | `?merchantId=` | Chọn sẵn SME khi upload giao dịch |
| `/assess` | `?merchantId=` | Gửi nhanh kết quả POS analysis tới SME đó (hộp thoại Send to Merchant) |
| `/merchants` | `?filter=review` | Lọc danh sách theo `latestScore.recommendation === REVIEW` |

### A. Portfolio Dashboard

- Portfolio KPIs: total merchants, approved/review/declined counts, avg score, portfolio value.
- **Ưu tiên hôm nay:** cảnh báo mức cao, CTA hồ sơ cần xem xét, xem nhanh loan case DRAFT/IN_REVIEW.
- Score distribution and grade distribution charts.
- Recent assessments + alerts panel.
- Fallback to demo data if backend is unreachable.

Frontend: `sme-creditmind-ai/src/app/(dashboard)/dashboard/page.tsx`  
Backend: `sme-creditmind-ai-backend/app/api/dashboard.py`

### B. Merchant Portfolio Management

- Merchant list with search, grade filter, and optional `?filter=review`.
- Merchant detail: workflow strip, deep links to POS upload / assess / live capture, **loan case** card, Approve/Decline/Manual Review → `POST/PATCH /api/loan-cases`.
- Score gauge, recommendation, pre-approved limit, risk factors, monthly trend; AI narrative tab (rút gọn “Xem thêm”) và AI Co-Pilot.
- **`/loan-queue`:** bảng loan cases, resolve tên merchant.

Frontend: `sme-creditmind-ai/src/app/(dashboard)/merchants`, `(dashboard)/loan-queue/page.tsx`  
Backend: `sme-creditmind-ai-backend/app/api/merchants.py`, `app/api/loan_cases.py`

### C. Credit Scoring Engine

- Rule/statistics-based scoring from monthly aggregates.
- Output: `score (0-1000)`, `grade (A-E)`, `riskLevel`, `recommendation`, `preApprovedLimit`, factor-level explanations.
- Factor families: revenue stability, volume, customers, consistency, digital adoption, seasonality, growth momentum.

Engine: `sme-creditmind-ai-backend/app/services/scoring_engine.py`

### D. POS Capture + AI Assessment Workflow

- Live POS evidence capture from camera/upload, stored in browser localStorage.
- Assessment page can run AI analysis and save results back to merchant credit profile.

Frontend:
- `sme-creditmind-ai/src/app/(dashboard)/live-pos-capture/page.tsx`
- `sme-creditmind-ai/src/app/(dashboard)/assess/page.tsx`

Backend:
- `sme-creditmind-ai-backend/app/api/ai_chat.py` (`/pos-assessment`, `/pos-assessment/save`)
- `sme-creditmind-ai-backend/app/services/pos_orchestrator.py`

### E. AI Co-Pilot (Chat)

- Merchant-aware assistant for risk explanations, improvement suggestions, what-if scenarios, and comparisons.

Frontend: `sme-creditmind-ai/src/app/(dashboard)/chat/page.tsx`  
Backend: `sme-creditmind-ai-backend/app/api/ai_chat.py` (`/chat`)

### F. AI Provider Runtime / Health

- Runtime config and health probing for configured providers.

Frontend: `sme-creditmind-ai/src/app/(dashboard)/settings/page.tsx`  
Backend: `sme-creditmind-ai-backend/app/api/ai_chat.py` (`/providers/config`, `/providers/health`)

### G. Transaction Ingestion API

- Upload merchant transactions via CSV/JSON; backend recomputes monthly aggregates and `months_active`.

Backend: `sme-creditmind-ai-backend/app/api/transactions.py`

---

## 5) Feature Status Matrix

| Area | Status | Notes |
|---|---|---|
| Dashboard analytics | Implemented | Live backend + fallback demo mode |
| Merchant list/detail | Implemented | Includes latest score and factors |
| Rules-based scoring | Implemented | Persisted scores + factors |
| POS image AI scoring | Implemented | Provider-driven assessment + save to DB |
| AI Co-Pilot chat | Implemented | Template/rules-driven responses |
| Provider runtime/health | Implemented | Qwen/OpenAI env + probe |
| Transaction upload | Implemented | UI: `/transaction-upload` + `?merchantId=` |
| Reports page | Implemented | Portfolio PDF via `/api/reports/*` + entitlement |
| POS integration buttons | UI prototype | Settings buttons not wired |
| Loan origination workflow | Partial | `loan_cases` API + merchant detail + `/loan-queue` |
| Auth / RBAC | Implemented | JWT access/refresh, memberships + roles, org-scoped queries |

---

## 6) API Endpoints

**Public**

- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/auth/me` (requires Bearer token)
- `POST /api/auth/change-password` (requires Bearer token)

**Authenticated (org-scoped)**

- `GET /api/dashboard/stats`
- `GET /api/merchants`, `GET /api/merchants/{merchant_id}`, `POST /api/merchants`
- `GET /api/credit-score/{merchant_id}`
- `POST /api/assess/{merchant_id}`
- `POST /api/transactions/upload` (multipart form)
- `GET /api/ai/providers/config`, `GET /api/ai/providers/health`
- `POST /api/ai/chat`, `POST /api/ai/pos-assessment`, `POST /api/ai/pos-assessment/save` (quota on heavy routes)
- Financial document pipeline routes under `/api/financial-documents/*` (quota)
- `GET /api/reports/usage`, `GET /api/reports`, `POST /api/reports/generate/portfolio`, `GET /api/reports/{id}/download`
- `GET /api/loan-cases`, `POST /api/loan-cases`, `PATCH /api/loan-cases/{id}`

---

## 7) Data Model (Core Tables)

**Tenant & access**

- `organizations`, `users`, `memberships`, `password_reset_tokens`
- `subscription_plans`, `org_subscriptions`
- `ai_usage_events`, `generated_reports`, `audit_logs`

**Business**

- `merchants` (includes `organization_id`)
- `transactions`, `monthly_aggregates`, `credit_scores`, `credit_factors`, `alerts`
- `loan_cases`

Child rows (transactions, scores, alerts) are isolated by joining through `merchants.organization_id`. Models are defined in `sme-creditmind-ai-backend/app/models`.

---

## 8) Local Setup

### Prerequisites

- Node.js `>=20`
- Python `3.10+` (recommended `3.11`)

### Install dependencies

```bash
npm install
```

```bash
cd sme-creditmind-ai-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Run both frontend + backend

**macOS / Linux**

```bash
npm run dev
```

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8008`
- Set `BACKEND_INTERNAL_ORIGIN=http://127.0.0.1:8008` in `sme-creditmind-ai/.env.local` if needed.

**Windows**

```bash
npm run dev:win
```

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8012`
- Use `BACKEND_INTERNAL_ORIGIN=http://127.0.0.1:8012` in `sme-creditmind-ai/.env.local` (default in `next.config.ts`).

See **[DEPLOY.md](./DEPLOY.md)** for a full port table and GCP notes.

### Seed sample data (optional)

```bash
cd sme-creditmind-ai-backend
python app/seed.py
```

Demo bank user (after seed): **`admin@demo.creditmind.example.com`** / **`DemoBank!2026`**. Use organization id **`org-demo`** as `X-Organization-Id` (the dashboard stores this after login).

### PostgreSQL + Alembic (production-style)

```bash
cd sme-creditmind-ai-backend
set CREDITMIND_DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/creditmind
python -m alembic upgrade head
python app/seed.py
```

Baseline revision: `58738aa26214` (`bank_ready_baseline`); then `a1b2c3d4e5f6` (`password_reset_tokens`). For a fresh database, run `alembic upgrade head`; `create_all` on startup remains a safety net for local SQLite.

### Docker Compose (Postgres + API + UI)

From the repo root:

```bash
docker compose up --build
```

Then seed once: `docker compose exec backend python app/seed.py`

- UI: `http://localhost:3000` (proxies `/api` to the backend container).
- API: `http://localhost:8008`

---

## 9) Environment Variables

Backend prefix: `CREDITMIND_`

- `DATABASE_URL` (env: `CREDITMIND_DATABASE_URL`) — SQLite default, or `postgresql+psycopg2://...` for PostgreSQL
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- **Password reset:** `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default 60), `PUBLIC_APP_URL` (frontend base URL for reset links, e.g. `https://app.example.com`)
- **Optional SMTP** (if unset, reset tokens are still created but email is not sent; check server logs in development): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `FROM_EMAIL`
- `CORS_ORIGINS` (list / JSON in env), `CORS_ALLOW_LOCAL_REGEX` (set `false` in production)
- `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL`, `QWEN_TEXT_MODEL`
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_ORG` (optional), `OPENAI_PROJECT` (optional)
- `LLM_TIMEOUT_SECONDS`

Frontend:

- `NEXT_PUBLIC_API_URL` — leave empty for same-origin `/api` proxy (recommended with `BACKEND_INTERNAL_ORIGIN` in `next.config.ts`)
- `BACKEND_INTERNAL_ORIGIN` — server-side rewrite target: **`http://127.0.0.1:8012`** on Windows with `npm run dev:win`, **`http://127.0.0.1:8008`** on macOS/Linux with `npm run dev`, or `http://backend:8008` in Docker Compose (see [DEPLOY.md](./DEPLOY.md))
- `NEXT_PUBLIC_SHOW_DEMO_LOGIN_HINT` — set to `true` to show seed demo credentials on the login page in production (default: hidden in production)
- `NEXT_PUBLIC_LEGAL_PRIVACY_URL`, `NEXT_PUBLIC_LEGAL_TERMS_URL`, `NEXT_PUBLIC_SUPPORT_URL` — optional footer links on login/register

**GCP / Cloud Run (outline)**

- Build and deploy the backend container; set secrets via **Secret Manager** (`CREDITMIND_JWT_SECRET_KEY`, AI keys, `CREDITMIND_DATABASE_URL` pointing at **Cloud SQL**).
- Deploy the frontend container or static hosting; set `BACKEND_INTERNAL_ORIGIN` to the internal/private URL of the API service if using a shared VPC / internal load balancer, or expose a single public API URL and set `NEXT_PUBLIC_API_URL` accordingly.
- Run `alembic upgrade head` as a Cloud Run job or init container before traffic.

---

## 10) Project Structure

```text
.
|- api/
|- sme-creditmind-ai/
|  |- src/app/(dashboard)/
|  |- src/components/
|  |- src/lib/
|  \- src/types/
|- sme-creditmind-ai-backend/
|  |- app/api/
|  |- app/models/
|  |- app/services/
|  |- app/schemas/
|  |- app/seed.py
|  \- run.py
\- package.json
```

---

## 11) Demo Flow for Judges

1. Open dashboard and explain portfolio view + alerts.
2. Open merchant detail and walk through score/factors/narrative.
3. Capture POS evidence in Live POS Capture.
4. Run AI POS assessment in New Assessment.
5. Save assessment to a merchant and refresh merchant profile.
6. Use AI Co-Pilot for risk explanation + what-if.
7. Show Settings provider health.

---

## 12) Notes

- Release **v2.0.0** adds bank-oriented multi-tenancy, JWT auth, subscription quotas for AI and paid reports, audit logging, rate limits on auth routes, and Docker/Postgres support.
- **Semantic versioning**: tag this baseline in Git as `v2.0.0` (or newer patch) to mark the post-MVP bank-ready drop.
- Remaining product gaps: deeper loan UI, POS integration buttons, and optional SSO (SAML/OIDC) for enterprise banks.

## 13) Tests

```bash
cd sme-creditmind-ai-backend
python -m pip install -r requirements.txt
set CREDITMIND_JWT_SECRET_KEY=test-secret
python -m pytest tests/ -q
```

`tests/test_bank_ready.py` covers health, login, and tenant isolation. `tests/test_password_reset.py` covers forgot-password messaging, reset token flow, and change-password.

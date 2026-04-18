# SME CreditMind AI

**AI-driven SME credit assessment from POS data**  
Built for **Shinhan Bank Vietnam x Qwen AI Build Day (SB09)**.

---

## 1) Project Snapshot

SME CreditMind AI is a two-tier MVP that helps loan officers assess SME creditworthiness using POS transaction evidence.

- Frontend: `Next.js` dashboard for portfolio monitoring, merchant analysis, POS capture workflow, and AI co-pilot.
- Backend: `FastAPI` service for merchant APIs, scoring logic, AI orchestration, and health checks.
- Data layer: `SQLite + SQLAlchemy` with seeded sample merchants and transactions.

This README is aligned with the **current codebase implementation**.

---

## 2) Current Architecture (Implemented)

```text
Next.js (sme-creditmind-ai)  --->  FastAPI (sme-creditmind-ai-backend)  --->  SQLite
         |                                  |                              (creditmind.db)
         |                                  +--> Scoring Engine (pandas/numpy)
         |                                  +--> AI Orchestrator (Qwen/OpenAI compatible API)
         +--> Live POS Capture (browser localStorage)
```

Key runtime behavior:

- Root `npm run dev` starts both frontend (`3000`) and backend (`8000`) concurrently.
- Frontend uses `NEXT_PUBLIC_API_URL` to call backend endpoints.
- Backend creates DB tables on startup and exposes `/api/health` with DB + AI provider status.

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

### A. Portfolio Dashboard

- Portfolio KPIs: total merchants, approved/review/declined counts, avg score, portfolio value.
- Score distribution and grade distribution charts.
- Recent assessments + alerts panel.
- Fallback to demo data if backend is unreachable.

Frontend: `sme-creditmind-ai/src/app/(dashboard)/dashboard/page.tsx`  
Backend: `sme-creditmind-ai-backend/app/api/dashboard.py`

### B. Merchant Portfolio Management

- Merchant list with search and grade filter.
- Merchant detail page with score gauge, recommendation, pre-approved limit, risk factors, and monthly trend.
- AI narrative tab and quick jump to AI Co-Pilot.

Frontend: `sme-creditmind-ai/src/app/(dashboard)/merchants`  
Backend: `sme-creditmind-ai-backend/app/api/merchants.py`

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
| Transaction upload API | Implemented (API) | No dedicated upload UI flow yet |
| Reports page | UI prototype | Static report list; no export backend |
| POS integration buttons | UI prototype | Settings buttons not wired |
| Loan origination workflow | Partial UX | Decision buttons not persisted as loan cases |
| Auth / RBAC | Not implemented | No login/session/RBAC in current app |

---

## 6) API Endpoints

- `GET /api/health`
- `GET /api/dashboard/stats`
- `GET /api/merchants`
- `GET /api/merchants/{merchant_id}`
- `POST /api/merchants`
- `GET /api/credit-score/{merchant_id}`
- `POST /api/assess/{merchant_id}`
- `POST /api/transactions/upload` (multipart form)
- `GET /api/ai/providers/config`
- `GET /api/ai/providers/health`
- `POST /api/ai/chat`
- `POST /api/ai/pos-assessment`
- `POST /api/ai/pos-assessment/save`

---

## 7) Data Model (Core Tables)

- `merchants`
- `transactions`
- `monthly_aggregates`
- `credit_scores`
- `credit_factors`
- `alerts`

Models are defined in `sme-creditmind-ai-backend/app/models`.

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

```bash
npm run dev
```

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8000`

### Seed sample data (optional)

```bash
cd sme-creditmind-ai-backend
python app/seed.py
```

---

## 9) Environment Variables

Backend prefix: `CREDITMIND_`

- `QWEN_API_KEY`
- `QWEN_BASE_URL`
- `QWEN_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_ORG` (optional)
- `OPENAI_PROJECT` (optional)
- `LLM_TIMEOUT_SECONDS`

Frontend:

- `NEXT_PUBLIC_API_URL` (example: `http://127.0.0.1:8000`)

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

- The repository currently reflects an MVP/prototype implementation.
- Some UI modules are forward-looking (report export, integration setup, full loan workflow).
- Productionization priorities: auth/RBAC, workflow state management, audit exports, and infra hardening.

# CreditMind AI Backend

FastAPI backend for the CreditMind AI SME credit scoring platform. Provides real credit assessment based on POS transaction data analysis.

## Architecture

- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM with SQLite (production-ready for PostgreSQL)
- **Pandas / NumPy** — Transaction data analytics and scoring computations
- **Real Credit Scoring Engine** — 7-factor analysis from actual transaction data

## Credit Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Revenue Stability | 22% | Coefficient of variation of monthly revenue |
| Transaction Volume | 15% | Daily average transaction count |
| Customer Base | 15% | Unique customers, growth rate |
| Operating Consistency | 15% | Percentage of active business days |
| Digital Payment Adoption | 10% | Card/e-wallet/QR vs cash ratio |
| Seasonal Resilience | 8% | Seasonal volatility index |
| Growth Momentum | 15% | Revenue trend slope |

## Quick Start

Prefer a **virtual environment** so tools like `httpx` match `requirements.txt` (avoids `ModuleNotFoundError` when using system Python):

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Seed database with realistic transaction data (200K+ transactions)
.venv/bin/python -m app.seed

# Start development server
.venv/bin/python run.py
```

From the monorepo root you can use `npm run setup:backend` once, then `npm run dev:backend` (uses `./run-backend.sh` and `.venv` automatically).

Server runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/merchants` | List merchants (search, grade filter) |
| GET | `/api/merchants/{id}` | Merchant detail + score + revenue |
| POST | `/api/merchants` | Create new merchant |
| GET | `/api/credit-score/{merchantId}` | Credit score detail with factors |
| POST | `/api/assess/{merchantId}` | Run new credit assessment |
| GET | `/api/dashboard/stats` | Portfolio dashboard statistics |
| POST | `/api/transactions/upload` | Upload CSV/JSON transaction data |
| POST | `/api/ai/chat` | AI co-pilot chat |
| GET | `/api/health` | Health check |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CREDITMIND_DATABASE_URL` | `sqlite:///creditmind.db` | Database connection URL |
| `CREDITMIND_CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |

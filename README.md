# Nestflo Market Intelligence — Web Application

React + TypeScript + Tailwind CSS frontend with FastAPI backend.
Deployed on Render.com.

## Products

1. **HMO Market Reports** — Select a city, pick up to 3 postcodes, get tribunal-ready evidence packs.
2. **HMO Target vs Comparables** — Benchmark a SpareRoom listing against the local market.
3. **Target vs Comparables for New Landlords** — Coming soon.

## Development

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (separate terminal)
cd backend && pip install -r requirements.txt && python3 main.py
```

## Production

```bash
cd frontend && npm run build
cd backend && python3 main.py  # serves React build + API
```

## Deploy to Render

One-click via `render.yaml` or manual Web Service:
- **Build:** `cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt`
- **Start:** `cd backend && python3 main.py`

#!/usr/bin/env python3
"""
Nestflo Market Intelligence — API Backend
Serves the React SPA and handles report generation requests.

In production, FastAPI serves the built React app from ../frontend/dist/.
In development, Vite dev server proxies /api calls here (port 8898).
"""

import json
import os
import re
import subprocess
import sys
import threading
import datetime as dt
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr

# ── Config ──
PORT = int(os.environ.get("PORT", "8898"))
AGENTS_DIR = Path(__file__).resolve().parent.parent / ".."  # agents/echo/
WORKSPACE = AGENTS_DIR.parent.parent  # openclaw/workspace/
DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
IS_PROD = DIST_DIR.exists()

app = FastAPI(title="Nestflo Market Intelligence API", version="1.0.0")

# ── Models ──

class MarketReportRequest(BaseModel):
    city: str
    postcodes: list[str]  # max 3
    email: EmailStr

class TargetVsComparableRequest(BaseModel):
    url: str
    first_name: str
    last_name: str
    email: EmailStr

class SubscribeRequest(BaseModel):
    email: EmailStr

# ── Helpers ──

UK_POSTCODE_RE = re.compile(r'^[A-Z]{1,2}\d{1,2}[A-Z]?$')

def validate_uk_postcode(pc: str) -> bool:
    return bool(UK_POSTCODE_RE.match(pc.strip().upper()))

def log_request(log_type: str, data: dict):
    """Append to JSONL log file."""
    log_path = WORKSPACE / "memory" / "echo" / "web_requests.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, 'a') as f:
        f.write(json.dumps({
            'timestamp': dt.datetime.utcnow().isoformat(),
            'type': log_type,
            **data,
        }) + '\n')

# ── API Routes ──

@app.post("/api/market-report")
async def api_market_report(req: MarketReportRequest):
    """Product 1: Queue HMO Market Reports for specified postcodes."""
    # Validate postcodes
    postcodes = [pc.strip().upper() for pc in req.postcodes]
    if len(postcodes) > 3:
        raise HTTPException(400, "Maximum 3 postcodes allowed.")
    if len(postcodes) < 1:
        raise HTTPException(400, "At least 1 postcode required.")

    for pc in postcodes:
        if not validate_uk_postcode(pc):
            raise HTTPException(400, f"Invalid UK postcode: {pc}")

    # Remove duplicates
    unique_pcs = list(dict.fromkeys(postcodes))

    # Log the request
    log_request('market_report', {
        'city': req.city,
        'postcodes': unique_pcs,
        'email': req.email,
    })

    return {"success": True, "message": f"Request received. {len(unique_pcs)} postcode(s) queued for {req.city}."}


@app.post("/api/target-vs-comparable")
async def api_target_vs_comparable(request: Request):
    """Product 2: Run Target vs Comparable pipeline (via Echo)."""
    body = await request.body()
    params = dict(urllib.parse.parse_qs(body.decode('utf-8')))

    url = (params.get('url', [''])[0] or '').strip()
    first = (params.get('first_name', [''])[0] or '').strip()
    last = (params.get('last_name', [''])[0] or '').strip()
    email = (params.get('email', [''])[0] or '').strip()

    errors = []
    if not url or 'spareroom.co.uk' not in url or 'flatshare' not in url:
        errors.append('Invalid SpareRoom URL.')
    ad_id_match = re.search(r'flatshare_id=(\d+)', url)
    if not ad_id_match:
        errors.append('Could not extract Ad ID from URL.')
    if not first:
        errors.append('First name required.')
    if not last:
        errors.append('Last name required.')
    if not email or '@' not in email:
        errors.append('Valid email required.')

    if errors:
        return JSONResponse({"success": False, "errors": errors}, status_code=400)

    ad_id = ad_id_match.group(1)
    customer_name = f"{first} {last}"

    log_request('target_vs_comparable', {
        'ad_id': ad_id, 'customer_name': customer_name,
        'customer_email': email, 'listing_url': url,
    })

    # Run pipeline in background thread
    def run_pipeline():
        try:
            result = subprocess.run(
                [sys.executable, str(AGENTS_DIR / "target_vs_comparable_orchestrator.py"), "--url", url],
                cwd=str(AGENTS_DIR), capture_output=True, text=True, timeout=600
            )
            output = result.stdout + "\n" + result.stderr

            pm = re.search(r'Postcode:\s+(\w+)', output)
            rm = re.search(r'Room Type:\s+([\w\s-]+)', output)
            rentm = re.search(r'Target:\s+(\d+)', output)
            p50m = re.search(r'Market P50:\s+(\d+)', output)

            postcode = pm.group(1).strip() if pm else "?"
            room_type = rm.group(1).strip() if rm else "?"
            rent = rentm.group(1) if rentm else "?"
            p50 = p50m.group(1) if p50m else "?"

            report_dir = WORKSPACE / "memory" / "echo" / "reports" / "target_vs_comparable" / ad_id
            pdfs = sorted(report_dir.glob("*.pdf"), key=lambda f: f.stat().st_mtime, reverse=True)
            pdf_path = str(pdfs[0]) if pdfs else ""

            qa_lines = [l for l in output.split('\n') if '✅' in l or '❌' in l]
            qa_passed = sum(1 for l in qa_lines if '✅' in l)
            qa_total = len(qa_lines)

            # Try to send approval email
            try:
                body_text = (
                    f"Hi Roland,\n\n"
                    f"A new HMO Target vs Comparables Report is ready for review.\n\n"
                    f"CUSTOMER DETAILS\n"
                    f"  Name:     {customer_name}\n"
                    f"  Email:    {email}\n"
                    f"  Listing:  {url}\n\n"
                    f"REPORT SUMMARY\n"
                    f"  Ad ID:    {ad_id}\n"
                    f"  Postcode: {postcode}\n"
                    f"  Room:     {room_type}\n"
                    f"  Rent:     {rent} pcm\n"
                    f"  Market P50: {p50}\n"
                    f"  QA:       {qa_passed}/{qa_total} checks\n\n"
                    f"Please review the report. Once approved, Echo sends to {email}.\n\n"
                    f"— Echo"
                )
                subprocess.run([
                    'gog', 'gmail', 'send',
                    '--account', 'hello@kunpro.co.uk',
                    '--to', 'roland.tao@nestflo.com',
                    '--subject', f'HMO Target vs Comparables — Approval — Ad {ad_id}, {postcode} {room_type}',
                    '--body', body_text,
                ] + (['--attach', pdf_path] if pdf_path and Path(pdf_path).exists() else []),
                    capture_output=True, text=True, timeout=30
                )
                print(f"✅ Approval email sent for Ad {ad_id}")
            except Exception as e:
                print(f"⚠️  Approval email failed for Ad {ad_id}: {e}")

            log_request('pipeline_complete', {
                'ad_id': ad_id, 'postcode': postcode, 'room_type': room_type,
                'rent': rent, 'p50': p50, 'qa_passed': qa_passed, 'qa_total': qa_total,
            })

        except subprocess.TimeoutExpired:
            print(f"❌ Pipeline timed out for Ad {ad_id}")
        except Exception as e:
            print(f"❌ Pipeline error for Ad {ad_id}: {e}")
            import traceback; traceback.print_exc()

    threading.Thread(target=run_pipeline, daemon=True).start()
    return {"success": True, "message": "Request received. Processing."}


@app.post("/api/subscribe")
async def api_subscribe(req: SubscribeRequest):
    """Product 3: Coming Soon email signup."""
    log_request('subscribe', {'email': req.email})
    return {"success": True, "message": "Subscribed. We'll notify you at launch."}


# ── Serve React SPA (production) ──

if IS_PROD:
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = DIST_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Fall through to index.html for React Router
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/")
    async def serve_root():
        return FileResponse(DIST_DIR / "index.html")


# ── Main ──

if __name__ == '__main__':
    import uvicorn
    import urllib.parse  # needed for TargetVsComparable form parsing

    print(f"\n{'='*60}")
    print(f"  Nestflo Market Intelligence API")
    print(f"  Port: {PORT}")
    print(f"  Mode: {'PRODUCTION' if IS_PROD else 'DEVELOPMENT'}")
    print(f"{'='*60}\n")
    uvicorn.run(app, host='0.0.0.0', port=PORT)

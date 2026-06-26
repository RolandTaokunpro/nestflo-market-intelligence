#!/usr/bin/env python3
"""
Pipeline Receiver — runs on the Mac mini behind a Cloudflare tunnel.

Accepts validated pipeline requests from the Render-hosted frontend
and dispatches them to Echo's orchestrator scripts.

Start with:
    python3 pipeline_receiver.py
    # Then in another terminal:
    # cloudflared tunnel --url http://localhost:8899

Env vars:
    PORT (default: 8899)
    PIPELINE_API_KEY — shared secret that Render sends in X-API-Key header
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
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Config ──
PORT = int(os.environ.get("PORT", "8899"))
PIPELINE_API_KEY = os.environ.get("PIPELINE_API_KEY", "changeme")
AGENTS_DIR = Path(__file__).resolve().parent.parent.parent / "agents" / "echo"
ACTUAL_WORKSPACE = Path(__file__).resolve().parent.parent.parent  # ...openclaw/workspace/
WORKSPACE = Path(__file__).resolve().parent.parent.parent.parent  # ...openclaw/ (legacy)
ECHO_MEMORY = ACTUAL_WORKSPACE / "memory" / "echo"
LOG_DIR = Path(__file__).resolve().parent / "logs"
LARK_WEBHOOK_URL = os.environ.get("LARK_WEBHOOK_URL", "")

app = FastAPI(title="Nestflo Pipeline Receiver", version="1.0.0")

# ── Models ──

class MarketReportPayload(BaseModel):
    city: str
    postcodes: list[str]
    first_name: str = ""
    last_name: str = ""
    email: str
    company_name: str = ""

class TargetVsComparablePayload(BaseModel):
    url: str
    ad_id: str
    first_name: str
    last_name: str
    email: str
    company_name: str = ""

# ── Auth middleware ──

def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key", "")
    if key != PIPELINE_API_KEY:
        raise HTTPException(403, "Invalid API key")

# ── Helpers ──

def log_request(log_type: str, data: dict):
    """Log to pipeline_requests.jsonl AND Echo's queue files."""
    log_path = WORKSPACE / "memory" / "echo" / "pipeline_requests.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {'timestamp': dt.datetime.utcnow().isoformat(), 'type': log_type, **data}
    with open(log_path, 'a') as f:
        f.write(json.dumps(entry) + '\n')

    # Also write to Echo's queue files so Echo knows about incoming requests
    ECHO_MEMORY.mkdir(parents=True, exist_ok=True)

    if log_type == 'target_vs_comparable_received':
        tvc_path = ECHO_MEMORY / 'tvc_requests.jsonl'
        with open(tvc_path, 'a') as f:
            f.write(json.dumps({
                'timestamp': entry['timestamp'],
                'ad_id': data.get('ad_id', ''),
                'customer_name': data.get('customer_name', ''),
                'customer_email': data.get('email', ''),
                'listing_url': data.get('listing_url', ''),
                'company_name': data.get('company_name', ''),
                'status': 'queued',
            }) + '\n')

    elif log_type == 'target_vs_comparable_complete':
        tvc_path = ECHO_MEMORY / 'tvc_requests.jsonl'
        with open(tvc_path, 'a') as f:
            f.write(json.dumps({
                'timestamp': entry['timestamp'],
                'ad_id': data.get('ad_id', ''),
                'postcode': data.get('postcode', ''),
                'room_type': data.get('room_type', ''),
                'rent': data.get('rent', ''),
                'p50': data.get('p50', ''),
                'qa_passed': data.get('qa_passed', 0),
                'qa_total': data.get('qa_total', 0),
                'status': 'complete',
            }) + '\n')

    elif log_type == 'market_report_received':
        mr_path = ECHO_MEMORY / 'market_report_requests.jsonl'
        for pc in data.get('postcodes', []):
            with open(mr_path, 'a') as f:
                f.write(json.dumps({
                    'timestamp': entry['timestamp'],
                    'postcode': pc,
                    'city': data.get('city', ''),
                    'email': data.get('email', ''),
                    'company_name': data.get('company_name', ''),
                    'status': 'queued',
                }) + '\n')

    elif log_type == 'market_report_complete':
        mr_path = ECHO_MEMORY / 'market_report_requests.jsonl'
        with open(mr_path, 'a') as f:
            f.write(json.dumps({
                'timestamp': entry['timestamp'],
                'postcode': data.get('postcode', ''),
                'city': data.get('city', ''),
                'email': data.get('email', ''),
                'qa_passed': data.get('qa_passed', 0),
                'qa_total': data.get('qa_total', 0),
                'status': 'complete',
            }) + '\n')


# ── Lark notification ──

def notify_lark(product: str, customer_name: str, email: str,
                company_name: str, detail: str, detail_label: str):
    """Post a new-order notification to the Echo Lark channel via webhook."""
    if not LARK_WEBHOOK_URL:
        print("⚠️  LARK_WEBHOOK_URL not set — skipping Lark notification")
        return

    import requests
    now = dt.datetime.now(dt.UTC).strftime('%Y-%m-%d %H:%M UTC')
    body = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": f"🆕 New {product} Order"},
                "template": "indigo",
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": (
                            f"**Customer:** {customer_name}\n"
                            f"**Company:** {company_name or '—'}\n"
                            f"**Email:** {email}\n"
                            f"**{detail_label}:** {detail}\n"
                            f"**Time:** {now}"
                        ),
                    },
                },
                {"tag": "hr"},
                {
                    "tag": "note",
                    "elements": [
                        {"tag": "plain_text", "content": "Echo pipeline receiver — automated notification"}
                    ],
                },
            ],
        },
    }

    try:
        resp = requests.post(LARK_WEBHOOK_URL, json=body, timeout=10)
        if resp.status_code == 200:
            print(f"✅ Lark notification sent for {product}: {customer_name}")
        else:
            print(f"⚠️  Lark webhook returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"⚠️  Lark notification failed: {e}")

# ── API Routes ──

@app.post("/api/pipeline/market-report")
async def receive_market_report(payload: MarketReportPayload, request: Request):
    """Receive a validated market report request from Render and queue it."""
    verify_api_key(request)

    unique_pcs = list(dict.fromkeys([pc.strip().upper() for pc in payload.postcodes]))
    customer_name = f"{payload.first_name} {payload.last_name}"

    log_request('market_report_received', {
        'city': payload.city,
        'postcodes': unique_pcs,
        'email': payload.email,
        'company_name': payload.company_name,
    })

    # Notify Echo Lark channel
    notify_lark(
        product="HMO Market Report",
        customer_name=customer_name,
        email=payload.email,
        company_name=payload.company_name,
        detail=", ".join(unique_pcs),
        detail_label="Postcodes",
    )

    def run():
        script = AGENTS_DIR / "market_report_orchestrator.py"
        for pc in unique_pcs:
            try:
                result = subprocess.run(
                    [sys.executable, str(script),
                     "--city", payload.city,
                     "--postcode", pc,
                     "--email", payload.email,
                     "--name", customer_name],
                    cwd=str(AGENTS_DIR), capture_output=True, text=True, timeout=600
                )
                output = result.stdout + "\n" + result.stderr
                qa_lines = [l for l in output.split('\n') if '✅' in l or '❌' in l]
                qa_passed = sum(1 for l in qa_lines if '✅' in l)
                qa_total = len(qa_lines)
                log_request('market_report_complete', {
                    'city': payload.city, 'postcode': pc,
                    'email': payload.email,
                    'qa_passed': qa_passed, 'qa_total': qa_total,
                })
                print(f"✅ Market report complete for {pc}, {payload.city} ({qa_passed}/{qa_total} QA)")
            except subprocess.TimeoutExpired:
                print(f"❌ Pipeline timed out for {pc}")
            except Exception as e:
                print(f"❌ Pipeline error for {pc}: {e}")
                import traceback; traceback.print_exc()

    threading.Thread(target=run, daemon=True).start()
    return {"success": True, "message": f"Queued {len(unique_pcs)} report(s) for {payload.city}."}


@app.post("/api/pipeline/target-vs-comparable")
async def receive_target_vs_comparable(payload: TargetVsComparablePayload, request: Request):
    """Receive a validated Target vs Comparable request from Render and queue it."""
    verify_api_key(request)

    customer_name = f"{payload.first_name} {payload.last_name}"

    log_request('target_vs_comparable_received', {
        'ad_id': payload.ad_id,
        'customer_name': customer_name,
        'email': payload.email,
        'listing_url': payload.url,
        'company_name': payload.company_name,
    })

    # Notify Echo Lark channel
    notify_lark(
        product="Target vs Comparable",
        customer_name=customer_name,
        email=payload.email,
        company_name=payload.company_name,
        detail=f"Ad {payload.ad_id}",
        detail_label="Ad ID",
    )

    def run():
        try:
            script = AGENTS_DIR / "target_vs_comparable_orchestrator.py"
            result = subprocess.run(
                [sys.executable, str(script), "--url", payload.url],
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

            log_request('target_vs_comparable_complete', {
                'ad_id': payload.ad_id, 'postcode': postcode,
                'room_type': room_type, 'rent': rent, 'p50': p50,
            })
            print(f"✅ Target vs Comparable complete for Ad {payload.ad_id}: {postcode} {room_type} £{rent} vs £{p50}")

            # Try to send approval email
            report_dir = WORKSPACE / "memory" / "echo" / "reports" / "target_vs_comparable" / payload.ad_id
            pdfs = sorted(report_dir.glob("*.pdf"), key=lambda f: f.stat().st_mtime, reverse=True) if report_dir.exists() else []
            pdf_path = str(pdfs[0]) if pdfs else ""

            if pdf_path:
                body = (
                    f"Hi Roland,\n\n"
                    f"A new HMO Target vs Comparables Report is ready for review.\n\n"
                    f"CUSTOMER DETAILS\n"
                    f"  Name:     {customer_name}\n"
                    f"  Email:    {payload.email}\n"
                    f"  Listing:  {payload.url}\n\n"
                    f"REPORT SUMMARY\n"
                    f"  Ad ID:    {payload.ad_id}\n"
                    f"  Postcode: {postcode}\n"
                    f"  Room:     {room_type}\n"
                    f"  Rent:     {rent} pcm\n"
                    f"  Market P50: {p50}\n\n"
                    f"— Echo"
                )
                subprocess.run([
                    'gog', 'gmail', 'send',
                    '--account', 'hello@kunpro.co.uk',
                    '--to', 'roland.tao@nestflo.com',
                    '--subject', f'HMO Target vs Comparables — Approval — Ad {payload.ad_id}, {postcode} {room_type}',
                    '--body', body,
                    '--attach', pdf_path,
                ], capture_output=True, text=True, timeout=30)

        except subprocess.TimeoutExpired:
            print(f"❌ Pipeline timed out for Ad {payload.ad_id}")
        except Exception as e:
            print(f"❌ Pipeline error for Ad {payload.ad_id}: {e}")
            import traceback; traceback.print_exc()

    threading.Thread(target=run, daemon=True).start()
    return {"success": True, "message": f"Queued Target vs Comparable for Ad {payload.ad_id}."}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": dt.datetime.utcnow().isoformat()}

# ── Main ──

if __name__ == '__main__':
    import uvicorn
    print(f"\n{'='*60}")
    print(f"  Nestflo Pipeline Receiver")
    print(f"  Port: {PORT}")
    print(f"  API Key: {'configured' if PIPELINE_API_KEY != 'changeme' else '⚠️  USING DEFAULT'}")
    print(f"{'='*60}\n")
    uvicorn.run(app, host='0.0.0.0', port=PORT)

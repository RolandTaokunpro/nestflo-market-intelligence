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
import smtplib
import subprocess
import sys
import threading
import urllib.parse
import datetime as dt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr

# ── Config ──
PORT = int(os.environ.get("PORT", "8898"))
PIPELINE_BACKEND_URL = os.environ.get("PIPELINE_BACKEND_URL", "").rstrip('/')
PIPELINE_API_KEY = os.environ.get("PIPELINE_API_KEY", "")
# SMTP for order notifications (Gmail SMTP with app password)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
AGENTS_DIR = Path(__file__).resolve().parent.parent / ".."  # agents/echo/
WORKSPACE = AGENTS_DIR.parent.parent  # openclaw/workspace/
LOG_DIR = Path(__file__).resolve().parent / "logs"
DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
IS_PROD = DIST_DIR.exists()

app = FastAPI(title="Nestflo Market Intelligence API", version="1.0.0")

# ── Middleware ──

# Security headers
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    return response

# Rate limiting — simple in-memory throttle
RATE_LIMIT: dict[str, list[float]] = {}
RATE_MAX_REQUESTS = 10  # max requests
RATE_WINDOW = 60  # per 60 seconds

def _get_client_ip(request: Request) -> str:
    """Get real client IP, respecting X-Forwarded-For when behind a proxy."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        # Take the first IP in the chain (the original client)
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method != "OPTIONS":
        now = dt.datetime.utcnow().timestamp()
        client_ip = _get_client_ip(request)
        timestamps = RATE_LIMIT.get(client_ip, [])
        # Prune old timestamps
        timestamps = [t for t in timestamps if now - t < RATE_WINDOW]
        if len(timestamps) >= RATE_MAX_REQUESTS:
            return JSONResponse(
                {"detail": "Too many requests. Please wait before trying again."},
                status_code=429,
            )
        timestamps.append(now)
        RATE_LIMIT[client_ip] = timestamps
    return await call_next(request)

# ── Models ──

class MarketReportRequest(BaseModel):
    city: str
    postcodes: list[str]  # max 3
    first_name: str = ""
    last_name: str = ""
    email: EmailStr
    company_name: str = ""

class TargetVsComparableRequest(BaseModel):
    url: str
    first_name: str
    last_name: str
    email: EmailStr
    company_name: str = ""

class SubscribeRequest(BaseModel):
    email: EmailStr

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    message: str = ""

# ── Helpers ──

UK_POSTCODE_RE = re.compile(r'^[A-Z]{1,2}\d{1,2}[A-Z]?$')

# Valid UK postcode area prefixes (124 areas)
VALID_POSTCODE_AREAS = frozenset([
    'AB','AL','B','BA','BB','BD','BH','BL','BN','BR','BS','BT','CA','CB',
    'CF','CH','CM','CO','CR','CT','CV','CW','DA','DD','DE','DG','DH','DL',
    'DN','DT','DY','E','EC','EH','EN','EX','FK','FY','G','GL','GU','GY',
    'HA','HD','HG','HP','HR','HS','HU','HX','IG','IM','IP','IV','JE','KA',
    'KT','KW','KY','L','LA','LD','LE','LL','LN','LS','LU','M','ME','MK',
    'ML','N','NE','NG','NN','NP','NR','NW','OL','OX','PA','PE','PH','PL',
    'PO','PR','RG','RH','RM','S','SA','SE','SG','SK','SL','SM','SN','SO',
    'SP','SR','SS','ST','SW','SY','TA','TD','TF','TN','TQ','TR','TS','TW',
    'UB','W','WA','WC','WD','WF','WN','WR','WS','WV','YO','ZE',
])
FREE_EMAIL_DOMAINS = {'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'protonmail.com', 'aol.com', 'mail.com', 'gmx.com', 'ymail.com'}

def is_business_email(email: str) -> bool:
    """Reject free email providers."""
    domain = email.split('@')[-1].lower() if '@' in email else ''
    return domain and domain not in FREE_EMAIL_DOMAINS

def validate_uk_postcode(pc: str) -> bool:
    """Validate UK postcode format AND area prefix."""
    pc = pc.strip().upper()
    if not UK_POSTCODE_RE.match(pc):
        return False
    # Extract area prefix: 1 or 2 letters before digits
    area_match = re.match(r'^([A-Z]{1,2})\d', pc)
    if not area_match:
        return False
    return area_match.group(1) in VALID_POSTCODE_AREAS

# HTML tag pattern for stripping XSS from text fields
HTML_TAG_RE = re.compile(r'<[^>]*>')
MAX_NAME_LENGTH = 100
MAX_COMPANY_LENGTH = 200

def sanitize_text(value: str, max_length: int = MAX_NAME_LENGTH) -> str:
    """Strip HTML tags and truncate to max length."""
    cleaned = HTML_TAG_RE.sub('', value).strip()
    return cleaned[:max_length]

def log_request(log_type: str, data: dict):
    """Append to JSONL log file. Falls back to local dir on remote."""
    log_path = WORKSPACE / "memory" / "echo" / "web_requests.jsonl"
    if not log_path.parent.exists():
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / "web_requests.jsonl"
    else:
        log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, 'a') as f:
        f.write(json.dumps({
            'timestamp': dt.datetime.utcnow().isoformat(),
            'type': log_type,
            **data,
        }) + '\n')

def forward_to_macmini(endpoint: str, payload: dict) -> tuple[bool, str]:
    """Forward a validated pipeline request to the Mac mini via Cloudflare tunnel.
    Returns (success, message)."""
    if not PIPELINE_BACKEND_URL:
        msg = "PIPELINE_BACKEND_URL not set"
        print(f"⚠️  {msg}")
        return False, msg

    import requests
    url = f"{PIPELINE_BACKEND_URL}{endpoint}"
    headers = {"Content-Type": "application/json", "X-API-Key": PIPELINE_API_KEY}
    last_error = None

    for attempt in range(3):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code == 200:
                result = resp.json()
                print(f"✅ Forwarded to Mac mini: {result}")
                return True, "Forwarded"
            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except requests.exceptions.Timeout:
            last_error = "Timeout (30s)"
        except requests.exceptions.ConnectionError as e:
            last_error = f"Connection error: {e}"
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"

        if attempt < 2:
            import time
            time.sleep(2)

    msg = f"Forward failed after 3 attempts: {last_error}"
    print(f"⚠️  {msg}")
    return False, msg


def send_order_email(to_email: str, cc_email: str, subject: str, body: str) -> bool:
    """Send order notification email via SMTP. Returns True on success."""
    if not SMTP_USER or not SMTP_PASS:
        print("⚠️  SMTP not configured — skipping email notification")
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Cc'] = cc_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        all_recipients = [to_email] + [cc_email]
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, all_recipients, msg.as_string())
        print(f"✅ Order notification emailed to {to_email} (CC {cc_email})")
        return True
    except Exception as e:
        print(f"❌ Email notification failed: {e}")
        return False


# ── API Routes ──

@app.post("/api/market-report")
async def api_market_report(req: MarketReportRequest):
    """Product 1: Queue HMO Market Reports for specified postcodes."""
    # Validate postcodes
    postcodes = [pc.strip().upper() for pc in req.postcodes]
    if len(postcodes) > 3:
        raise HTTPException(400, "Maximum 3 postcodes allowed.")
    if not is_business_email(req.email):
        raise HTTPException(400, "Business email required. Free email providers not accepted.")
    if not req.first_name or not req.first_name.strip():
        raise HTTPException(400, "First name is required.")
    if not req.last_name or not req.last_name.strip():
        raise HTTPException(400, "Last name is required.")
    if len(postcodes) < 1:
        raise HTTPException(400, "At least 1 postcode required.")

    for pc in postcodes:
        if not validate_uk_postcode(pc):
            raise HTTPException(400, f"Invalid UK postcode: {pc}")

    # Remove duplicates
    unique_pcs = list(dict.fromkeys(postcodes))

    # Sanitize user inputs
    safe_first = sanitize_text(req.first_name)
    safe_last = sanitize_text(req.last_name)
    safe_company = sanitize_text(req.company_name, MAX_COMPANY_LENGTH)

    # Log the request
    log_request('market_report', {
        'city': req.city,
        'postcodes': unique_pcs,
        'first_name': safe_first,
        'last_name': safe_last,
        'email': req.email,
        'company_name': safe_company,
    })

    # Forward to Mac mini pipeline receiver, or run locally as fallback
    customer_name = f"{safe_first} {safe_last}"
    forwarded, fwd_msg = forward_to_macmini("/api/pipeline/market-report", {
        "city": req.city,
        "postcodes": unique_pcs,
        "first_name": safe_first,
        "last_name": safe_last,
        "email": req.email,
        "company_name": safe_company,
    })

    if forwarded:
        # Send order notification email
        timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        send_order_email(
            to_email="hello@nestflo.ai",
            cc_email="roland.tao@nestflo.com",
            subject=f"🔔 New HMO Market Report Order — {customer_name} | {safe_company or 'No company'}",
            body=f"""New HMO Market Report Order
==========================

CUSTOMER DETAILS
  Name:     {customer_name}
  Company:  {safe_company or '—'}
  Email:    {req.email}

ORDER DETAILS
  City:     {req.city}
  Postcodes: {', '.join(unique_pcs)}
  Count:    {len(unique_pcs)} district(s)

ORDER INFO
  Received: {timestamp}
  Product:  Enhanced HMO Evidence Pack
  Forwarded: ✅ to Mac mini

Echo will process: echo_orchestrator.py for each postcode.
Reports will be archived to Drive after Jess approval.

— Nestflo Market Intelligence (automated)
"""
        )
        return {"success": True, "message": f"Request forwarded. {len(unique_pcs)} postcode(s) queued for {req.city}."}

    # Forward failed — send notification email anyway
    print(f"⚠️  Forward failed: {fwd_msg}")
    timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    send_order_email(
        to_email="hello@nestflo.ai",
        cc_email="roland.tao@nestflo.com",
        subject=f"🔔 New HMO Market Report Order — {customer_name} | {safe_company or 'No company'}",
        body=f"""New HMO Market Report Order (Mac mini unreachable)
===============================================

CUSTOMER DETAILS
  Name:     {customer_name}
  Company:  {safe_company or '—'}
  Email:    {req.email}

ORDER DETAILS
  City:     {req.city}
  Postcodes: {', '.join(unique_pcs)}
  Count:    {len(unique_pcs)} district(s)

ORDER INFO
  Received: {timestamp}
  Product:  Enhanced HMO Evidence Pack
  Forwarded: ❌ Failed — {fwd_msg}

⚠️  MANUAL PROCESSING REQUIRED — please run:
  python3 echo_orchestrator.py --postcode <PC> for each postcode

— Nestflo Market Intelligence (automated)
"""
    )

    # Fallback: run locally (only works when this server is on the Mac mini)
    def run_market_report_pipeline():
        try:
            script = AGENTS_DIR / "market_report_orchestrator.py"
            if not script.exists():
                print(f"⚠️  Market report orchestrator not found at {script}")
                log_request('pipeline_skip', {
                    'reason': 'orchestrator_missing',
                    'city': req.city,
                    'postcodes': unique_pcs,
                    'email': req.email,
                })
                return

            for pc in unique_pcs:
                result = subprocess.run(
                    [sys.executable, str(script),
                     "--city", req.city,
                     "--postcode", pc,
                     "--email", req.email,
                     "--name", customer_name],
                    cwd=str(AGENTS_DIR), capture_output=True, text=True, timeout=600
                )
                output = result.stdout + "\n" + result.stderr
                qa_lines = [l for l in output.split('\n') if '✅' in l or '❌' in l]
                qa_passed = sum(1 for l in qa_lines if '✅' in l)
                qa_total = len(qa_lines)
                log_request('market_report_complete', {
                    'city': req.city, 'postcode': pc,
                    'email': req.email, 'status': 'complete',
                    'qa_passed': qa_passed, 'qa_total': qa_total,
                })
                print(f"✅ Market report complete for {pc}, {req.city} ({qa_passed}/{qa_total} QA)")

        except subprocess.TimeoutExpired:
            print(f"❌ Market report pipeline timed out for {req.city}")
        except Exception as e:
            print(f"❌ Market report pipeline error: {e}")
            import traceback; traceback.print_exc()

    # Forward failed — return error so the user sees a failure message
    # instead of a fake success. Only attempt local fallback in dev.
    return JSONResponse(
        status_code=503,
        content={"success": False, "errors": [
            "Our processing system is temporarily unavailable. "
            "Please try again later or contact support at hello@nestflo.ai."
        ]},
    )


@app.post("/api/target-vs-comparable")
async def api_target_vs_comparable(request: Request):
    """Product 2: Run Target vs Comparable pipeline (via Echo)."""
    body = await request.body()
    params = dict(urllib.parse.parse_qs(body.decode('utf-8')))

    url = (params.get('url', [''])[0] or '').strip()
    first = (params.get('first_name', [''])[0] or '').strip()
    last = (params.get('last_name', [''])[0] or '').strip()
    email = (params.get('email', [''])[0] or '').strip()
    company_name = (params.get('company_name', [''])[0] or '').strip()

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
    if email and '@' in email and not is_business_email(email):
        errors.append('Business email required. Free email providers not accepted.')

    if errors:
        return JSONResponse({"success": False, "errors": errors}, status_code=400)

    ad_id = ad_id_match.group(1)

    # Sanitize user inputs
    safe_first = sanitize_text(first)
    safe_last = sanitize_text(last)
    safe_company = sanitize_text(company_name, MAX_COMPANY_LENGTH)
    customer_name = f"{safe_first} {safe_last}"

    log_request('target_vs_comparable', {
        'ad_id': ad_id, 'customer_name': customer_name,
        'customer_email': email, 'listing_url': url,
        'company_name': safe_company,
    })

    # Forward to Mac mini pipeline receiver, or run locally as fallback
    forwarded, fwd_msg = forward_to_macmini("/api/pipeline/target-vs-comparable", {
        "url": url,
        "ad_id": ad_id,
        "first_name": safe_first,
        "last_name": safe_last,
        "email": email,
        "company_name": safe_company,
    })

    if forwarded:
        # Send order notification email
        timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        send_order_email(
            to_email="hello@nestflo.ai",
            cc_email="roland.tao@nestflo.com",
            subject=f"🔔 New Target vs Comparable Order — {customer_name} | {safe_company or 'No company'}",
            body=f"""New Target vs Comparable Order
==============================

CUSTOMER DETAILS
  Name:     {customer_name}
  Company:  {safe_company or '—'}
  Email:    {email}

LISTING
  URL:      {url}
  Ad ID:    {ad_id}

ORDER INFO
  Received: {timestamp}
  Product:  Target vs Comparable
  Forwarded: ✅ to Mac mini

Echo will process: target_vs_comparable_orchestrator.py --url "{url}"
Report will be archived to Drive after Jess approval.

— Nestflo Market Intelligence (automated)
"""
        )
        return {"success": True, "message": "Request received. Processing."}

    # Forward failed — send notification email anyway
    print(f"⚠️  Forward failed: {fwd_msg}")
    timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    send_order_email(
        to_email="hello@nestflo.ai",
        cc_email="roland.tao@nestflo.com",
        subject=f"🔔 New Target vs Comparable Order — {customer_name} | {safe_company or 'No company'}",
        body=f"""New Target vs Comparable Order (Mac mini unreachable)
===================================================

CUSTOMER DETAILS
  Name:     {customer_name}
  Company:  {safe_company or '—'}
  Email:    {email}

LISTING
  URL:      {url}
  Ad ID:    {ad_id}

ORDER INFO
  Received: {timestamp}
  Product:  Target vs Comparable
  Forwarded: ❌ Failed — {fwd_msg}

⚠️  MANUAL PROCESSING REQUIRED — please run:
  python3 target_vs_comparable_orchestrator.py --url "{url}"

— Nestflo Market Intelligence (automated)
"""
    )

    # Fallback: run locally (only works when this server is on the Mac mini)
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

    # Forward failed — return error so the user sees a failure message
    return JSONResponse(
        status_code=503,
        content={"success": False, "errors": [
            "Our processing system is temporarily unavailable. "
            "Please try again later or contact support at hello@nestflo.ai."
        ]},
    )


@app.post("/api/subscribe")
async def api_subscribe(req: SubscribeRequest):
    """Product 3: Coming Soon email signup."""
    log_request('subscribe', {'email': req.email})
    return {"success": True, "message": "Subscribed. We'll notify you at launch."}


@app.post("/api/contact")
async def api_contact(req: ContactRequest):
    """Enterprise contact form — sends enquiry to Roland."""
    log_request('enterprise_contact', {
        'name': req.name,
        'email': req.email,
        'company': req.company,
        'message': req.message,
    })

    if not is_business_email(req.email):
        raise HTTPException(400, "Business email required. Free email providers not accepted.")

    body_text = (
        f"New Enterprise Enquiry\n"
        f"=======================\n\n"
        f"Name:    {req.name}\n"
        f"Email:   {req.email}\n"
        f"Company: {req.company}\n"
        f"Message: {req.message or '(none)'}\n"
    )

    send_order_email(
        to_email="hello@nestflo.ai",
        cc_email="roland.tao@nestflo.com",
        subject=f'Enterprise Enquiry — {req.company} ({req.name})',
        body=body_text,
    )
    return {"success": True, "message": "Thank you. We'll be in touch within one business day."}


# ── Chatbot (self-contained, no Mac mini dependency) ──

import requests
from chatbot import process_message, reset_session


class ChatbotMessage(BaseModel):
    sessionId: str = ""
    message: str


@app.get("/widget.js")
async def serve_widget():
    """Serve the HMO Intelligence chatbot widget JS from dist (Vite copies public/)."""
    widget_path = DIST_DIR / "widget.js"
    if not widget_path.exists():
        widget_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "widget.js"
    if widget_path.exists():
        return FileResponse(widget_path, media_type="application/javascript")
    raise HTTPException(404, "widget.js not found")


@app.post("/api/chatbot/init")
async def chatbot_init():
    """Initialize a new chatbot session and return welcome message."""
    import uuid
    sid = str(uuid.uuid4())
    result = process_message(sid, "hello")
    return JSONResponse(result)


@app.post("/api/chatbot/message")
async def chatbot_message(req: ChatbotMessage):
    """Process a user message through the chatbot state machine.
    When a lead is captured, forward to Talon and email Roland."""
    if not req.message.strip():
        raise HTTPException(400, "Message required")
    result = process_message(req.sessionId, req.message)

    # If a lead was captured (bespoke flow completed), notify Talon + Roland
    if result.get('leadCaptured') and result.get('leadDetails'):
        lead = result['leadDetails']
        name = lead.get('name', 'Unknown')
        email = lead.get('email', '')
        phone = lead.get('phone', '')
        timestamp = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        # 1. Forward lead to Talon's pending queue (best-effort via pipeline receiver)
        if PIPELINE_BACKEND_URL:
            try:
                talon_msg = (
                    f"📋 **New Chatbot Lead Captured**\n\n"
                    f"Name: {name}\n"
                    f"Email: {email}\n"
                    f"Phone: {phone or '—'}\n"
                    f"Source: HMO Market Intelligence chatbot\n"
                    f"Time: {timestamp}\n\n"
                    f"Roland — a prospect filled in the bespoke report form. "
                    f"Please follow up via email or phone."
                )
                resp = requests.post(
                    f"{PIPELINE_BACKEND_URL}/api/chat",
                    json={
                        'sessionId': f"lead-{req.sessionId}",
                        'message': talon_msg,
                        'name': name,
                        'email': email,
                        'phone': phone,
                    },
                    headers={"X-API-Key": PIPELINE_API_KEY},
                    timeout=10
                )
                if resp.status_code == 200:
                    print(f"✅ Lead forwarded to Talon: {name} <{email}>")
                else:
                    print(f"⚠️  Talon forward returned {resp.status_code}: {resp.text[:100]}")
            except Exception as e:
                print(f"⚠️  Talon forward failed: {e}")

        # 2. Email notification to Roland
        phone_str = f"Phone: {phone}" if phone else "Phone: (not provided)"
        email_body = (
            f"📋 New Chatbot Lead Captured\n"
            f"{'=' * 40}\n\n"
            f"LEAD DETAILS\n"
            f"  Name:  {name}\n"
            f"  Email: {email}\n"
            f"  {phone_str}\n\n"
            f"SOURCE\n"
            f"  Channel: HMO Market Intelligence chatbot\n"
            f"  Session: {req.sessionId}\n"
            f"  Time:    {timestamp}\n\n"
            f"ACTION REQUIRED\n"
            f"  A prospect requested a bespoke report. Follow up via "
            f"email or phone to discuss their requirements.\n\n"
            f"— Nestflo Market Intelligence (automated)"
        )
        send_order_email(
            to_email="hello@nestflo.ai",
            cc_email="roland.tao@nestflo.com",
            subject=f"📋 New Chatbot Lead — {name}",
            body=email_body,
        )

    return JSONResponse(result)


@app.post("/api/chatbot/reset")
async def chatbot_reset(req: ChatbotMessage):
    """Reset a chatbot session."""
    if req.sessionId:
        result = reset_session(req.sessionId)
        return JSONResponse(result)
    raise HTTPException(400, "sessionId required")


# ── Chatbot Proxy (forward to pipeline receiver → local chatbot, legacy fallback) ──


@app.post("/api/chat")
async def proxy_chat(request: Request):
    """Proxy chat message to chatbot via pipeline receiver."""
    body = await request.json()
    if not PIPELINE_BACKEND_URL:
        return JSONResponse({"error": "Pipeline backend not configured"}, status_code=503)
    try:
        resp = requests.post(
            f"{PIPELINE_BACKEND_URL}/api/chat",
            json=body,
            headers={"X-API-Key": PIPELINE_API_KEY},
            timeout=30
        )
        return resp.json()
    except requests.RequestException as e:
        print(f"⚠️  Chatbot proxy /api/chat failed: {e}")
        return JSONResponse({"error": "Chatbot temporarily unavailable"}, status_code=502)


@app.post("/api/response")
async def proxy_response(request: Request):
    """Proxy assistant response to chatbot via pipeline receiver."""
    body = await request.json()
    if not PIPELINE_BACKEND_URL:
        return JSONResponse({"error": "Pipeline backend not configured"}, status_code=503)
    try:
        resp = requests.post(
            f"{PIPELINE_BACKEND_URL}/api/response",
            json=body,
            headers={"X-API-Key": PIPELINE_API_KEY},
            timeout=30
        )
        return resp.json()
    except requests.RequestException as e:
        print(f"⚠️  Chatbot proxy /api/response failed: {e}")
        return JSONResponse({"error": "Chatbot temporarily unavailable"}, status_code=502)


@app.get("/api/chat/{session_id}")
async def proxy_poll(session_id: str, request: Request):
    """Proxy poll for messages to chatbot via pipeline receiver."""
    if not PIPELINE_BACKEND_URL:
        return JSONResponse({"error": "Pipeline backend not configured"}, status_code=503)
    since = request.query_params.get("since", "0")
    try:
        resp = requests.get(
            f"{PIPELINE_BACKEND_URL}/api/chat/{session_id}",
            params={"since": since},
            headers={"X-API-Key": PIPELINE_API_KEY},
            timeout=30
        )
        return resp.json()
    except requests.RequestException as e:
        print(f"⚠️  Chatbot proxy /api/chat/{session_id} failed: {e}")
        return JSONResponse({"error": "Chatbot temporarily unavailable"}, status_code=502)


@app.get("/api/pending")
async def proxy_pending():
    """Proxy pending messages request to chatbot via pipeline receiver."""
    if not PIPELINE_BACKEND_URL:
        return JSONResponse({"error": "Pipeline backend not configured"}, status_code=503)
    try:
        resp = requests.get(
            f"{PIPELINE_BACKEND_URL}/api/pending",
            headers={"X-API-Key": PIPELINE_API_KEY},
            timeout=30
        )
        return resp.json()
    except requests.RequestException as e:
        print(f"⚠️  Chatbot proxy /api/pending failed: {e}")
        return JSONResponse({"error": "Chatbot temporarily unavailable"}, status_code=502)


@app.get("/api/new-leads")
async def proxy_leads(request: Request):
    """Proxy new leads request to chatbot via pipeline receiver."""
    if not PIPELINE_BACKEND_URL:
        return JSONResponse({"error": "Pipeline backend not configured"}, status_code=503)
    since = request.query_params.get("since", "0")
    try:
        resp = requests.get(
            f"{PIPELINE_BACKEND_URL}/api/new-leads",
            params={"since": since},
            headers={"X-API-Key": PIPELINE_API_KEY},
            timeout=30
        )
        return resp.json()
    except requests.RequestException as e:
        print(f"⚠️  Chatbot proxy /api/new-leads failed: {e}")
        return JSONResponse({"error": "Chatbot temporarily unavailable"}, status_code=502)


# ── Serve React SPA (production) ──

if IS_PROD:
    # Mount static assets directory
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # SPA catch-all: serve index.html for all non-asset, non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "API endpoint not found")
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/")
    async def serve_root():
        return FileResponse(DIST_DIR / "index.html")


# ── Main ──

if __name__ == '__main__':
    import uvicorn

    print(f"\n{'='*60}")
    print(f"  Nestflo Market Intelligence API")
    print(f"  Port: {PORT}")
    print(f"  Mode: {'PRODUCTION' if IS_PROD else 'DEVELOPMENT'}")
    print(f"{'='*60}\n")
    uvicorn.run(app, host='0.0.0.0', port=PORT)

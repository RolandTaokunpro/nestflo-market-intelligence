"""
Chatbot State Machine — HMO Market Intelligence
Self-contained decision tree — no external agent needed.
Jim-built, 2026-07-08
"""

import uuid
import json
import time
from pathlib import Path

# --- Constants ---
SAMPLE_MR_LINK = "/sample-market-report.pdf"
SAMPLE_TVC_LINK = "/sample-target-vs-comparable.pdf"
MARKET_REPORT_LINK = "/market-reports"
TVC_LINK = "/target-vs-comparable"
CALENDAR_LINK = "https://calendar.app.google/KSQx4rG9L6ytS4je7"

# --- Session Store ---
sessions: dict = {}
LEADS_FILE = Path(__file__).resolve().parent / "chatbot_leads.jsonl"


def _get_lead_count() -> int:
    """Count existing leads in the log file."""
    if not LEADS_FILE.exists():
        return 0
    return sum(1 for _ in open(LEADS_FILE))


def get_session(sid: str) -> dict:
    """Get or create a session."""
    if not sid or sid not in sessions:
        sid = sid or str(uuid.uuid4())
        sessions[sid] = {
            'id': sid,
            'state': 'welcome',
            'lead_name': None,
            'lead_email': None,
            'lead_phone': None,
            'created_at': time.time(),
            'lead_count_at_start': _get_lead_count(),
        }
    return sessions[sid]


def _save_lead(session: dict):
    """Persist captured lead to JSONL file."""
    if not session.get('lead_name') or not session.get('lead_email'):
        return
    LEADS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LEADS_FILE, 'a') as f:
        f.write(json.dumps({
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'name': session['lead_name'],
            'email': session['lead_email'],
            'phone': session.get('lead_phone'),
            'session_id': session['id'],
        }) + '\n')


# --- Intent Matching ---
def match_intent(text: str) -> str:
    """Match user input to an intent."""
    t = text.lower().strip()

    if any(kw == t or kw in t for kw in ['market report', 'market', 'postcode', 'hmo report',
                                            'area report', 'district', 'market_report']):
        return 'market_report'
    if any(kw in t for kw in ['target vs', 'comparable', 'benchmark', 'listing',
                                'comparison', 'compare', 'vs comparable', 'tvc']):
        return 'tvc'
    if any(kw in t for kw in ['bespoke', 'custom', 'tailored', 'personal',
                                'specific', 'portfolio', 'multiple']):
        return 'bespoke'
    if any(kw in t for kw in ['sample', 'example', 'not sure', 'unsure',
                                'browse', "what's available", 'options', 'help',
                                'show me', 'what do you']):
        return 'unsure'
    if any(kw in t for kw in ['call', 'demo', 'calendar', 'video', 'meeting',
                                'speak', 'talk to', 'book']):
        return 'call'
    if any(kw == t for kw in ['hi', 'hello', 'hey', 'good morning', 'good afternoon',
                                'yo', 'howdy']):
        return 'greeting'
    if t in ['no', 'nope', 'no thanks', "that's all", 'all good', "i'm good",
              'done', 'nothing', 'im good']:
        return 'decline'

    return 'unknown'


# --- Response Builders ---

def _r(sid: str, message: str, quick_replies: list = None, state: str = 'welcome',
      lead_capture: dict = None, external_link: str = None, lead_captured: bool = False) -> dict:
    return {
        'sessionId': sid,
        'message': message,
        'quickReplies': quick_replies or [],
        'state': state,
        'leadCapture': lead_capture,
        'externalLink': external_link,
        'leadCaptured': lead_captured,
    }


def _mr_response(sid: str) -> dict:
    return _r(sid, (
        "📊 **HMO Market Report** — Your postcode-level rental evidence.\n\n"
        "✅ P25, P50, P75 percentiles for every room type\n"
        "✅ Verified SpareRoom listings with timestamped screenshots\n"
        "✅ Tribunal-ready methodology statement\n"
        "✅ Covers all room types: Single, Double, En-Suite, Studio\n\n"
        f"👉 [**Get your free Market Report →**]({MARKET_REPORT_LINK})\n\n"
        "Want to explore our other product?"
    ), [
        {'label': '🎯 Target vs Comparable', 'value': 'tvc'},
        {'label': '📅 Book a Demo', 'value': 'call'},
        {'label': '✨ Bespoke Report', 'value': 'bespoke'},
        {'label': "No, that's all", 'value': 'done'},
    ], state='market_report', external_link=MARKET_REPORT_LINK)


def _tvc_response(sid: str) -> dict:
    return _r(sid, (
        "🎯 **Target vs Comparable** — Benchmark your listing.\n\n"
        "✅ Compare your room rent against live market data\n"
        "✅ See exactly where your rent sits vs market P50\n"
        "✅ 20+ comparables matched by room type & postcode\n"
        "✅ Perfect for rent reviews and tenant negotiations\n\n"
        f"👉 [**Get your free report →**]({TVC_LINK})\n\n"
        "Want to explore our other product?"
    ), [
        {'label': '📊 HMO Market Report', 'value': 'market_report'},
        {'label': '📅 Book a Demo', 'value': 'call'},
        {'label': '✨ Bespoke Report', 'value': 'bespoke'},
        {'label': "No, that's all", 'value': 'done'},
    ], state='tvc', external_link=TVC_LINK)


def _calendar_response(sid: str) -> dict:
    return _r(sid, (
        "📅 **Book a video call with Roland**\n\n"
        "Schedule a 30-minute call to discuss your HMO portfolio, "
        "market data needs, or any questions about our reports.\n\n"
        f"👉 [**Book your slot here →**]({CALENDAR_LINK})"
    ), [
        {'label': '📊 HMO Market Report', 'value': 'market_report'},
        {'label': '🎯 Target vs Comparable', 'value': 'tvc'},
        {'label': '✨ Bespoke Report', 'value': 'bespoke'},
    ], state='welcome', external_link=CALENDAR_LINK)


def _done_response(sid: str) -> dict:
    return _r(sid, (
        "👍 You're all set! Here's a quick recap:\n\n"
        f"📊 **HMO Market Report** → [Order free]({MARKET_REPORT_LINK})\n"
        f"🎯 **Target vs Comparable** → [Order free]({TVC_LINK})\n"
        f"📅 **Book a Demo** → [Schedule a call]({CALENDAR_LINK})\n\n"
        "Need anything else? I'm here to help!"
    ), [
        {'label': '📊 HMO Market Report', 'value': 'market_report'},
        {'label': '🎯 Target vs Comparable', 'value': 'tvc'},
        {'label': '📅 Book a Demo', 'value': 'call'},
    ], state='welcome')


def _welcome_response(sid: str, greeting: bool = False) -> dict:
    msg = (
        "👋 Hi there! Welcome to Nestflo HMO Market Intelligence.\n\n"
        "I can help you understand what every room in your HMO is worth. "
        "Which type of report would you like to explore?"
    ) if greeting else (
        "👋 Welcome to Nestflo HMO Market Intelligence!\n\n"
        "Which type of report are you interested in?"
    )
    return _r(sid, msg, [
        {'label': '📊 HMO Market Report', 'value': 'market_report'},
        {'label': '🎯 Target vs Comparable', 'value': 'tvc'},
        {'label': '✨ Bespoke Report', 'value': 'bespoke'},
        {'label': '👀 Show me samples', 'value': 'unsure'},
    ], state='welcome')


def _unsure_response(sid: str) -> dict:
    return _r(sid, (
        "No worries! Here's a quick overview with sample PDFs:\n\n"
        f"📊 **HMO Market Report**\n"
        f"→ Postcode-level rental data, all room types, tribunal-ready.\n"
        f"→ [📄 View sample report]({SAMPLE_MR_LINK})\n\n"
        f"🎯 **Target vs Comparable**\n"
        f"→ Benchmark your listing against live market data.\n"
        f"→ [📄 View sample report]({SAMPLE_TVC_LINK})\n\n"
        "Which one interests you?"
    ), [
        {'label': '📊 HMO Market Report', 'value': 'market_report'},
        {'label': '🎯 Target vs Comparable', 'value': 'tvc'},
        {'label': '✨ Bespoke Report', 'value': 'bespoke'},
    ], state='unsure')


# --- Main Process Function ---
def process_message(sid: str, text: str) -> dict:
    """Process a user message and return the chatbot response."""
    session = get_session(sid)
    state = session['state']
    intent = match_intent(text)

    # --- Handle existing state transitions first ---
    if state == 'market_report':
        if intent == 'tvc':
            session['state'] = 'tvc'
            return _tvc_response(sid)
        if intent in ('call', 'bespoke'):
            if intent == 'call':
                return _calendar_response(sid)
            session['state'] = 'bespoke_name'
            return _r(sid, (
                "✨ **Bespoke Report** — Tailored to your needs.\n\n"
                "For portfolios, multi-property analysis, or custom requirements, "
                "I just need a few details.\n\nFirst — what's your name?"
            ), state='bespoke_name', lead_capture={'field': 'name', 'required': True})
        session['state'] = 'welcome'
        return _done_response(sid)

    if state == 'tvc':
        if intent == 'market_report':
            session['state'] = 'market_report'
            return _mr_response(sid)
        if intent in ('call', 'bespoke'):
            if intent == 'call':
                return _calendar_response(sid)
            session['state'] = 'bespoke_name'
            return _r(sid, (
                "✨ **Bespoke Report** — Tailored to your needs.\n\n"
                "For portfolios, multi-property analysis, or custom requirements, "
                "I just need a few details.\n\nFirst — what's your name?"
            ), state='bespoke_name', lead_capture={'field': 'name', 'required': True})
        session['state'] = 'welcome'
        return _done_response(sid)

    if state == 'unsure':
        if intent == 'market_report':
            session['state'] = 'market_report'
            return _mr_response(sid)
        if intent == 'tvc':
            session['state'] = 'tvc'
            return _tvc_response(sid)
        if intent == 'bespoke':
            session['state'] = 'bespoke_name'
            return _r(sid, (
                "✨ **Bespoke Report** — Tailored to your needs.\n\n"
                "For portfolios, multi-property analysis, or custom requirements, "
                "I just need a few details.\n\nFirst — what's your name?"
            ), state='bespoke_name', lead_capture={'field': 'name', 'required': True})
        return _r(sid, (
            "Which one caught your eye?\n\n"
            "• 📊 **HMO Market Report** — postcode-level rental data\n"
            "• 🎯 **Target vs Comparable** — benchmark your listing\n"
            "• ✨ **Bespoke Report** — custom analysis for your portfolio"
        ), [
            {'label': '📊 HMO Market Report', 'value': 'market_report'},
            {'label': '🎯 Target vs Comparable', 'value': 'tvc'},
            {'label': '✨ Bespoke Report', 'value': 'bespoke'},
        ], state='unsure')

    if state == 'bespoke_name':
        session['lead_name'] = text.strip()
        session['state'] = 'bespoke_email'
        return _r(sid, (
            f"Thanks, **{session['lead_name']}**! What's your business email address? 📧"
        ), state='bespoke_email', lead_capture={'field': 'email', 'required': True})

    if state == 'bespoke_email':
        session['lead_email'] = text.strip()
        session['state'] = 'bespoke_phone'
        return _r(sid, (
            "And your phone number? 📱 (optional — type 'skip' to skip)"
        ), [
            {'label': 'Skip', 'value': 'skip'},
        ], state='bespoke_phone', lead_capture={'field': 'phone', 'required': False})

    if state == 'bespoke_phone':
        if intent != 'decline' and text.strip().lower() not in ('skip', 'no phone'):
            session['lead_phone'] = text.strip()
        session['state'] = 'bespoke_done'
        _save_lead(session)
        phone_str = f" at {session['lead_phone']}" if session.get('lead_phone') else ""
        return _r(sid, (
            "✅ Perfect! Here's a summary:\n\n"
            f"• Name: **{session['lead_name']}**\n"
            f"• Email: **{session['lead_email']}**\n"
            + (f"• Phone: **{session['lead_phone']}**\n\n" if session.get('lead_phone') else "\n")
            + f"We'll reach out to discuss your bespoke report requirements{phone_str}.\n\n"
            f"📅 Prefer to schedule directly? [**Book a video call with Roland →**]({CALENDAR_LINK})"
        ), [
            {'label': '📅 Book a Call', 'value': 'call'},
            {'label': '🔍 Explore Reports', 'value': 'unsure'},
        ], state='bespoke_done', lead_captured=True, external_link=CALENDAR_LINK)

    if state == 'bespoke_done':
        if intent == 'call':
            return _calendar_response(sid)
        session['state'] = 'welcome'
        return _done_response(sid)

    # --- Intent routing from WELCOME ---
    if intent == 'market_report':
        session['state'] = 'market_report'
        return _mr_response(sid)
    if intent == 'tvc':
        session['state'] = 'tvc'
        return _tvc_response(sid)
    if intent == 'bespoke':
        session['state'] = 'bespoke_name'
        return _r(sid, (
            "✨ **Bespoke Report** — Tailored to your needs.\n\n"
            "For portfolios, multi-property analysis, or custom requirements, "
            "I just need a few details.\n\nFirst — what's your name?"
        ), state='bespoke_name', lead_capture={'field': 'name', 'required': True})
    if intent == 'unsure':
        session['state'] = 'unsure'
        return _unsure_response(sid)
    if intent == 'call':
        return _calendar_response(sid)
    if intent == 'greeting':
        return _welcome_response(sid, greeting=True)

    # Fallback: re-prompt
    return _welcome_response(sid)


def reset_session(sid: str) -> dict:
    """Reset a session to welcome state."""
    if sid in sessions:
        sessions[sid]['state'] = 'welcome'
    return _welcome_response(sid)

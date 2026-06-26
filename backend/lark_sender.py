#!/usr/bin/env python3
"""
Lark message sender using bot credentials (no webhook needed).
Usage: python3 lark_sender.py <bot_name> <recipient_email> <title> <body_text>
"""

import json
import os
import sys
import requests

# Bot credentials from env
BOTS = {
    "echo": {
        "app_id": "cli_a97a58f2ef78deed",
        "app_secret": os.environ.get("FEISHU_ECHO_APP_SECRET", ""),
    },
    "jess": {
        "app_id": "cli_aab658f227f9dee6",
        "app_secret": os.environ.get("FEISHU_JESS_APP_SECRET", ""),
    },
}

LARK_API = "https://open.larksuite.com"


def get_tenant_token(app_id: str, app_secret: str) -> str:
    resp = requests.post(
        f"{LARK_API}/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise Exception(f"Auth failed: {data}")
    return data["tenant_access_token"]


def send_message(token: str, recipient_email: str, title: str, body_text: str) -> dict:
    content = json.dumps([
        [{"tag": "text", "text": title}],
        [{"tag": "text", "text": body_text}],
    ])
    resp = requests.post(
        f"{LARK_API}/open-apis/im/v1/messages",
        params={"receive_id_type": "email"},
        headers={"Authorization": f"Bearer {token}"},
        json={
            "receive_id": recipient_email,
            "msg_type": "post",
            "content": json.dumps({
                "zh_cn": {
                    "title": title,
                    "content": [[{"tag": "text", "text": body_text}]],
                }
            }),
        },
        timeout=10,
    )
    return resp.json()


if __name__ == "__main__":
    bot = sys.argv[1]
    email = sys.argv[2]
    title = sys.argv[3]
    body = sys.argv[4]

    creds = BOTS[bot]
    token = get_tenant_token(creds["app_id"], creds["app_secret"])
    result = send_message(token, email, title, body)
    print(json.dumps(result, indent=2))

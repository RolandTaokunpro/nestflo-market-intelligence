#!/bin/bash
# Start pipeline receiver + Cloudflare tunnel
set -e

cd /Users/rolandtao/.openclaw/workspace/nestflo-market-intelligence/backend

echo "Starting pipeline receiver on :8899..."
nohup python3 -u pipeline_receiver.py > /tmp/pipeline-receiver.log 2>&1 &
echo "  PID: $!"

sleep 2

echo "Starting cloudflared tunnel → :8899..."
nohup cloudflared tunnel --url http://localhost:8899 > /tmp/nestflo-tunnel.log 2>&1 &
echo "  PID: $!"

sleep 6
TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' /tmp/nestflo-tunnel.log | tail -1)
echo "Tunnel URL: $TUNNEL_URL"

# Verify
sleep 2
HEALTH=$(curl -s "$TUNNEL_URL/health" 2>&1 || echo "FAILED")
echo "Health check: $HEALTH"

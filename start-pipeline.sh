#!/bin/bash
# start-pipeline.sh — Start the pipeline receiver + Cloudflare tunnel on the Mac mini
# Run this on the Mac mini whenever the tunnel goes down.
#
# Usage:
#   chmod +x start-pipeline.sh
#   ./start-pipeline.sh [API_KEY]
#
# Prerequisites:
#   - cloudflared installed (brew install cloudflare/cloudflare/cloudflared)
#   - Python 3.12+ with FastAPI deps (pip install -r backend/requirements.txt)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_KEY="${1:-$(openssl rand -hex 16)}"

echo "============================================"
echo "  Nestflo Pipeline Receiver + Tunnel"
echo "============================================"
echo ""
echo "  API Key: $API_KEY"
echo ""

# Export the API key
export PIPELINE_API_KEY="$API_KEY"
export PORT=8899

# Kill any existing receiver
pkill -f pipeline_receiver.py 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start the pipeline receiver
echo "[1/2] Starting pipeline receiver on port $PORT..."
cd "$SCRIPT_DIR"
python3 backend/pipeline_receiver.py &
RECEIVER_PID=$!
sleep 2

# Start the tunnel
echo "[2/2] Starting Cloudflare tunnel..."
cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee /tmp/nestflo-tunnel.log &
TUNNEL_PID=$!

echo ""
echo "============================================"
echo "  Pipeline receiver: PID $RECEIVER_PID"
echo "  Tunnel:            PID $TUNNEL_PID"
echo ""
echo "  Watch for the tunnel URL in the output above."
echo "  It looks like: https://xxx-xxx-xxx.trycloudflare.com"
echo ""
echo "  Once you have the URL, set it on Render:"
echo "    PIPELINE_BACKEND_URL = <tunnel URL>"
echo "    PIPELINE_API_KEY    = $API_KEY"
echo "============================================"
echo ""
echo "Logs: /tmp/nestflo-tunnel.log"
echo "Stop: kill $RECEIVER_PID $TUNNEL_PID"

wait

#!/bin/bash
# Wrapper for cloudflared tunnel — launched by launchctl
exec /opt/homebrew/bin/cloudflared tunnel --url http://localhost:8899 >> /tmp/nestflo-tunnel.log 2>&1

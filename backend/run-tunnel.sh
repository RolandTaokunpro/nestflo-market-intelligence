#!/bin/bash
# Wrapper for bore tunnel — launched by launchctl
exec /opt/homebrew/bin/bore local 8899 --to bore.pub --port 29093 >> /tmp/nestflo-tunnel.log 2>&1

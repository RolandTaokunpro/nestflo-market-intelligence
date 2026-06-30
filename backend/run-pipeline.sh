#!/bin/bash
# Wrapper for pipeline receiver — launched by launchctl
exec /opt/homebrew/bin/python3 -u /Users/rolandtao/.openclaw/workspace/nestflo-market-intelligence/backend/pipeline_receiver.py >> /tmp/pipeline-receiver.log 2>&1

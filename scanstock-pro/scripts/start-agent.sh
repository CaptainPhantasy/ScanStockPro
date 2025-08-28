#!/bin/bash

AGENT=$1

if [ -z "$AGENT" ]; then
  echo "Usage: ./start-agent.sh [1|2|3|4]"
  exit 1
fi

case $AGENT in
  1)
    echo "🔧 Starting Agent 1: Foundation & Infrastructure"
    AGENT_WORKSPACE=agent1-foundation npm run dev -- -p 3001
    ;;
  2)
    echo "📱 Starting Agent 2: Mobile Interface"
    AGENT_WORKSPACE=agent2-interface npm run dev -- -p 3002
    ;;
  3)
    echo "⚡ Starting Agent 3: Business Features"
    AGENT_WORKSPACE=agent3-features npm run dev -- -p 3003
    ;;
  4)
    echo "✅ Starting Agent 4: Quality & Integration"
    AGENT_WORKSPACE=agent4-quality npm run dev -- -p 3004
    ;;
  *)
    echo "Invalid agent number. Use 1, 2, 3, or 4."
    exit 1
    ;;
esac

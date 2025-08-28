#!/bin/bash

# Initialize git and create 4-agent branch structure
git init

# Main branch (integration target)
git checkout -b main
git add .
git commit -m "Initial project setup for 4-agent development"

# Agent 1: Foundation branch
git checkout -b agent1-foundation
echo "Working on Foundation & Infrastructure" > src/agent1-foundation/README.md
git add .
git commit -m "Agent 1: Foundation workspace"

# Agent 2: Mobile Interface branch
git checkout main
git checkout -b agent2-interface
echo "Working on Mobile-First Interface" > src/agent2-interface/README.md
git add .
git commit -m "Agent 2: Mobile Interface workspace"

# Agent 3: Business Features branch
git checkout main
git checkout -b agent3-features
echo "Working on Business Features & AI" > src/agent3-features/README.md
git add .
git commit -m "Agent 3: Features workspace"

# Agent 4: Quality branch
git checkout main
git checkout -b agent4-quality
echo "Working on Quality & Integration" > src/agent4-quality/README.md
git add .
git commit -m "Agent 4: Quality workspace"

echo "✅ All 4 agent branches created!"

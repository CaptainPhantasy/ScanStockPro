#!/bin/bash

echo "================================"
echo "Offline Queue Functionality Test"
echo "================================"
echo ""

# Check if the app is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Application not running on http://localhost:3000"
    echo "Starting the application..."
    npm run dev &
    APP_PID=$!
    echo "Waiting for app to start..."
    sleep 5
fi

# Run the Playwright test
echo "Running offline queue tests..."
echo ""

npx playwright test tests/offline-queue-test.ts --headed --reporter=list

# If we started the app, stop it
if [ ! -z "$APP_PID" ]; then
    echo ""
    echo "Stopping the application..."
    kill $APP_PID
fi

echo ""
echo "Test completed!"
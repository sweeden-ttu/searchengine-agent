#!/bin/bash
# Open Chrome with persistent profile and remote debugging for extension testing
# This allows you to manually test the extension while having DevTools access

PROFILE_PATH="/Users/sweeden/chrome-extension/tests/chrome-profile"
DEBUG_PORT=9222

echo "Opening Chrome with:"
echo "  - Persistent profile: $PROFILE_PATH"
echo "  - Remote debugging port: $DEBUG_PORT"
echo "  - Extension should already be installed in this profile"
echo ""
echo "Navigate to http://localhost:8080 for the test site"
echo "Click the extension icon in the toolbar to test"
echo ""
echo "To debug: open chrome://inspect/#devices in another Chrome window"
echo "Or connect chrome-devtools-mcp to http://127.0.0.1:$DEBUG_PORT"
echo ""

# Kill any existing Chrome with this profile
pkill -f "user-data-dir=$PROFILE_PATH" 2>/dev/null
sleep 1

# Start local test server in background
cd /Users/sweeden/chrome-extension/tests/test-site
python3 -m http.server 8080 > /dev/null 2>&1 &
SERVER_PID=$!
echo "Test server started (PID: $SERVER_PID) on http://localhost:8080"

sleep 1

# Open Chrome with persistent profile and remote debugging
open -a "Google Chrome" --args \
  --user-data-dir="$PROFILE_PATH" \
  --remote-debugging-port=$DEBUG_PORT \
  --no-first-run \
  http://localhost:8080

echo ""
echo "Chrome opened! You can now:"
echo "1. Click the extension icon to open Private Search Engine popup"
echo "2. Click 'Select Search Box' then click the search box on page"
echo "3. Enter search terms and click 'Start Crawl'"
echo ""
echo "To stop: pkill -f 'remote-debugging-port=$DEBUG_PORT'"
echo "Test server PID: $SERVER_PID - stop with: kill $SERVER_PID"

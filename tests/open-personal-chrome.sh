#!/bin/bash
# Open Chrome with YOUR PERSONAL PROFILE and the extension loaded
# This allows you to use your normal Chrome with all your settings

echo "=== Opening Chrome with Personal Profile + Extension ==="
echo ""

# Kill any existing Chrome with remote debugging
pkill -f "remote-debugging-port=9222" 2>/dev/null
sleep 1

# Your personal Chrome profile path (default location on macOS)
PERSONAL_PROFILE="$HOME/Library/Application Support/Google/Chrome"
EXTENSION_PATH="/Users/sweeden/chrome-extension/chrome-extension"
DEBUG_PORT=9222

echo "Personal Profile: $PERSONAL_PROFILE"
echo "Extension Path: $EXTENSION_PATH"
echo "Debug Port: $DEBUG_PORT"
echo ""

# Start local test server
cd /Users/sweeden/chrome-extension/tests/test-site
python3 -m http.server 8080 > /dev/null 2>&1 &
SERVER_PID=$!
echo "Test server started on http://localhost:8080 (PID: $SERVER_PID)"
sleep 1

# Open Chrome with personal profile
echo ""
echo "Opening Chrome with personal profile..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$PERSONAL_PROFILE" \
  --load-extension="$EXTENSION_PATH" \
  --remote-debugging-port=$DEBUG_PORT \
  --no-first-run \
  http://localhost:8080 2>/dev/null &

CHROME_PID=$!
echo "Chrome opened (PID: $CHROME_PID)"
echo ""
sleep 3

# Verify
echo "Verifying Chrome is running with remote debugging..."
curl -s http://127.0.0.1:$DEBUG_PORT/json 2>&1 | head -10

echo ""
echo "=== INSTRUCTIONS ==="
echo "1. Chrome should now be open with your personal profile"
echo "2. The Private Search Engine extension should be loaded"
echo "3. Navigate to any website with a search box"
echo "4. Click the extension icon in the toolbar"
echo "5. Click 'Select Search Box' then click the search box"
echo "6. Enter search terms and click 'Start Crawl'"
echo ""
echo "To stop: pkill -f 'remote-debugging-port=$DEBUG_PORT'"
echo "Test server PID: $SERVER_PID - stop with: kill $SERVER_PID"

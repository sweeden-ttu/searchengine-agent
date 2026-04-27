const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const { exec } = require('child_process');

const EXTENSION_PATH = path.resolve(__dirname, '../chrome-extension/chrome-extension');
const PROFILE_PATH = path.resolve(__dirname, './chrome-profile');
let localServer;

// Start local test server
before(function(done) {
  localServer = exec('cd ' + path.resolve(__dirname, '../tests/test-site') + ' && python3 -m http.server 8080');
  setTimeout(done, 2000);
});

after(function() {
  if (localServer) localServer.kill();
});

describe('Private Search Engine - Debug Extension', function() {
  this.timeout(60000);
  let driver;

  before(async () => {
    const options = new chrome.Options();
    options.addArguments(`--user-data-dir=${PROFILE_PATH}`);
    options.addArguments('--no-first-run');
    options.addArguments(`--load-extension=${EXTENSION_PATH}`);
    options.addArguments('--window-size=1280,1024');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should open extension popup (manual step)', async () => {
    await driver.get('http://localhost:8080');
    await driver.sleep(3000);

    // Get extension ID
    await driver.get('chrome://extensions');
    await driver.sleep(2000);
    
    console.log('\n=== MANUAL STEPS ===');
    console.log('1. Load extension from:', EXTENSION_PATH);
    console.log('2. Click "Details" on Private Search Engine');
    console.log('3. Copy the Extension ID');
    console.log('4. Extension popup URL: chrome-extension://{ID}/popup.html');
    console.log('5. Use the extension icon in toolbar to open popup\n');
    
    // Keep browser open for manual testing
    console.log('Browser will stay open for manual testing...');
    await driver.sleep(300000); // 5 minutes
  });
});

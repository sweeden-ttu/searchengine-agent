const { Builder, By, until, Key, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

const EXTENSION_PATH = path.resolve(__dirname, '../chrome-extension/chrome-extension');
const PROFILE_PATH = path.resolve(__dirname, './chrome-profile');
const CHROME_DEBUG_PORT = 9222;

describe('Private Search Engine - Attach to Running Chrome', function() {
  this.timeout(60000);
  let driver;

  before(async () => {
    // Connect to already running Chrome with remote debugging
    const options = new chrome.Options();
    options.debuggerAddress = `127.0.0.1:${CHROME_DEBUG_PORT}`;
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async () => {
    // Don't quit - just release the driver
    if (driver) {
      await driver.close(); // Close only the tab, not the browser
    }
  });

  it('should navigate to local test site', async () => {
    await driver.get('http://localhost:8080');
    await driver.sleep(2000);
    
    const title = await driver.getTitle();
    expect(title).to.equal('Local Search Test Page');
  });

  it('should find and interact with search box', async () => {
    await driver.get('http://localhost:8080');
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.id('searchInput'));
    await searchBox.clear();
    await searchBox.sendKeys('testing extension');
    await driver.sleep(500);
    
    expect(await searchBox.getAttribute('value')).to.equal('testing extension');
  });

  it('should submit search and see results', async () => {
    await driver.get('http://localhost:8080');
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.id('searchInput'));
    await searchBox.sendKeys('test search', Key.RETURN);
    await driver.sleep(2000);
    
    const resultsDiv = await driver.findElement(By.id('results'));
    expect(await resultsDiv.isDisplayed()).to.be.true;
  });

  it('should get extension ID from page context', async () => {
    await driver.get('http://localhost:8080');
    await driver.sleep(2000);
    
    // This will only work if extension content script is loaded
    const hasContentScript = await driver.executeScript(`
      return typeof TurndownService !== 'undefined';
    `);
    
    console.log('Content script loaded:', hasContentScript);
    // This might be false because content scripts load on page load
  });

  it('should simulate clicking extension icon (load popup URL)', async () => {
    // Get extension ID by checking what's installed
    await driver.get('chrome://extensions');
    await driver.sleep(3000);
    
    console.log('Extensions page opened. Extension should be visible here.');
    console.log('To test popup: click extension icon in toolbar');
    console.log('Or get extension ID and navigate to: chrome-extension://{ID}/popup.html');
  });
});

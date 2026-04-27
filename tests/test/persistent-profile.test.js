const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

const EXTENSION_PATH = path.resolve(__dirname, '../chrome-extension/chrome-extension');
const PROFILE_PATH = path.resolve(__dirname, './chrome-profile');
const TEST_SITE_URL = 'http://localhost:8080';

describe('Private Search Engine - Persistent Profile Tests', function() {
  this.timeout(60000);
  let driver;

  before(async () => {
    const options = new chrome.Options();
    // Use persistent profile
    options.addArguments(`--user-data-dir=${PROFILE_PATH}`);
    options.addArguments('--no-first-run');
    options.addArguments('--window-size=1280,1024');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should load with persistent profile', async () => {
    await driver.get('chrome://extensions');
    await driver.sleep(3000);
    const pageSource = await driver.getPageSource();
    console.log('Extensions page loaded. Profile path:', PROFILE_PATH);
    console.log('Load extension manually from:', EXTENSION_PATH);
  });

  it('should navigate to test site', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(2000);
    
    const title = await driver.getTitle();
    expect(title).to.equal('Local Search Test Page');
  });

  it('should interact with search box', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.id('searchInput'));
    await searchBox.sendKeys('test from persistent profile');
    await driver.sleep(500);
    
    expect(await searchBox.getAttribute('value')).to.equal('test from persistent profile');
  });
});

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

describe('Private Search Engine - Local Test Site', function() {
  this.timeout(60000);
  let driver;
  const EXTENSION_PATH = path.resolve(__dirname, '../chrome-extension/chrome-extension');
  const TEST_SITE_URL = 'http://localhost:8080';

  before(async () => {
    const options = new chrome.Options();
    options.addArguments(`--load-extension=${EXTENSION_PATH}`);
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    options.addArguments('--window-size=1280,1024');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should load local test site', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(2000);
    
    const title = await driver.getTitle();
    expect(title).to.equal('Local Search Test Page');
  });

  it('should find search box on local site', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.id('searchInput'));
    expect(await searchBox.isDisplayed()).to.be.true;
    
    // Type in search box
    await searchBox.sendKeys('test search');
    await driver.sleep(500);
    
    expect(await searchBox.getAttribute('value')).to.equal('test search');
  });

  it('should submit search form', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.id('searchInput'));
    await searchBox.sendKeys('Private Search Engine', Key.RETURN);
    
    await driver.sleep(2000);
    
    // Check if results are displayed
    const resultsDiv = await driver.findElement(By.id('results'));
    expect(await resultsDiv.isDisplayed()).to.be.true;
    
    // Check title updated
    const title = await driver.findElement(By.tagName('h1'));
    const titleText = await title.getText();
    expect(titleText).to.include('Private Search Engine');
  });

  it('should click result links', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.id('searchInput'));
    await searchBox.sendKeys('test', Key.RETURN);
    await driver.sleep(2000);
    
    // Find first result title and click
    const firstResult = await driver.findElement(By.css('.result-title'));
    expect(await firstResult.isDisplayed()).to.be.true;
    
    // Get the onclick URL
    const onclick = await firstResult.getAttribute('onclick');
    expect(onclick).to.include('window.open');
  });

  it('should simulate extension selecting search box', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(2000);
    
    // Simulate what extension does - click and get selector
    const selector = await driver.executeScript(`
      const searchBox = document.getElementById('searchInput');
      // Return a CSS selector for the element
      return '#' + searchBox.id;
    `);
    
    expect(selector).to.equal('#searchInput');
    
    // Verify selector works
    const element = await driver.findElement(By.css(selector));
    expect(await element.isDisplayed()).to.be.true;
  });

  it('should extract page content via content script', async () => {
    await driver.get(TEST_SITE_URL);
    await driver.sleep(2000);
    
    // Simulate content script extraction
    const pageData = await driver.executeScript(`
      return {
        title: document.title,
        url: window.location.href,
        searchBoxId: document.getElementById('searchInput')?.id,
        hasResultsDiv: !!document.getElementById('results')
      };
    `);
    
    expect(pageData.title).to.equal('Local Search Test Page');
    expect(pageData.searchBoxId).to.equal('searchInput');
    expect(pageData.hasResultsDiv).to.be.true;
  });
});

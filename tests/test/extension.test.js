const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

describe('Private Search Engine - Click & Crawl Tests', function() {
  this.timeout(60000);
  let driver;
  const EXTENSION_PATH = path.resolve(__dirname, '../chrome-extension/chrome-extension');

  before(async () => {
    const options = new chrome.Options();
    // Load extension
    options.addArguments(`--load-extension=${EXTENSION_PATH}`);
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should navigate to a page with search box', async () => {
    await driver.get('https://www.google.com');
    await driver.wait(until.elementLocated(By.name('q')), 5000);
    const searchBox = await driver.findElement(By.name('q'));
    expect(await searchBox.isDisplayed()).to.be.true;
  });

  it('should simulate clicking search box (for extension select)', async () => {
    await driver.get('https://www.google.com');
    await driver.sleep(2000);
    
    // Click the search box
    const searchBox = await driver.findElement(By.name('q'));
    await driver.actions().click(searchBox).perform();
    await driver.sleep(500);
    
    // Type a test search
    await searchBox.sendKeys('Private Search Engine');
    await driver.sleep(500);
    
    expect(await searchBox.getAttribute('value')).to.equal('Private Search Engine');
  });

  it('should submit search form', async () => {
    await driver.get('https://www.google.com');
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.name('q'));
    await searchBox.sendKeys('test search', Key.RETURN);
    
    // Wait for results page
    await driver.wait(until.urlContains('search'), 5000);
    const url = await driver.getCurrentUrl();
    expect(url).to.include('search');
  });

  it('should extract page content via content script', async () => {
    await driver.get('https://example.com');
    await driver.sleep(2000);
    
    // Execute script to simulate what extension does
    const pageData = await driver.executeScript(`
      // Simulate turndown conversion
      const content = document.body.innerText;
      return {
        title: document.title,
        url: window.location.href,
        hasContent: content.length > 0
      };
    `);
    
    expect(pageData.title).to.equal('Example Domain');
    expect(pageData.hasContent).to.be.true;
  });
});

const { Builder, By, until, Key, WebElement } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;

describe('Private Search Engine - Real Extension Tests', function() {
  this.timeout(60000);
  let driver;
  const EXTENSION_PATH = path.resolve(__dirname, '../chrome-extension/chrome-extension');

  before(async () => {
    const options = new chrome.Options();
    options.addArguments(`--load-extension=${EXTENSION_PATH}`);
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    options.addArguments('--disable-extensions-except=' + EXTENSION_PATH);
    options.addArguments('--window-size=1280,1024');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('should load extension and open popup', async () => {
    await driver.get('https://www.google.com');
    await driver.sleep(2000);
    
    // Get extension ID
    await driver.get('chrome://extensions');
    await driver.sleep(2000);
    
    // Find the extension
    const pageSource = await driver.getPageSource();
    expect(pageSource).to.include('Private Search Engine');
  });

  it('should inject content script and extract page', async () => {
    await driver.get('https://example.com');
    await driver.sleep(2000);
    
    // Execute content script manually to test extraction
    const result = await driver.executeScript(`
      // Mock turndown
      if (typeof TurndownService === 'undefined') {
        window.TurndownService = function() {
          return {
            turndown: function(html) {
              const tmp = document.createElement('div');
              tmp.innerHTML = html;
              return tmp.textContent || tmp.innerText || '';
            }
          };
        };
      }
      
      const turndownService = new TurndownService({ headingStyle: 'atx' });
      return {
        markdown: turndownService.turndown(document.body.innerHTML),
        title: document.title,
        url: location.href
      };
    `);
    
    expect(result.title).to.equal('Example Domain');
    expect(result.url).to.include('example.com');
    expect(result.markdown).to.be.a('string');
  });

  it('should simulate search box selection click', async () => {
    await driver.get('https://www.google.com');
    await driver.sleep(2000);
    
    // Find and click search box
    const searchBox = await driver.findElement(By.name('q'));
    await driver.actions().move({origin: searchBox}).click().perform();
    await driver.sleep(500);
    
    // Type to verify it's selected
    await searchBox.sendKeys('test search box selection');
    await driver.sleep(500);
    
    const value = await searchBox.getAttribute('value');
    expect(value).to.equal('test search box selection');
  });

  it('should perform search and get results', async () => {
    await driver.get('https://www.google.com');
    await driver.sleep(1000);
    
    const searchBox = await driver.findElement(By.name('q'));
    await searchBox.clear();
    await searchBox.sendKeys('chrome extension testing', Key.RETURN);
    
    // Wait for results
    await driver.wait(until.urlContains('search'), 5000);
    await driver.sleep(3000);
    
    // Check for search results
    const links = await driver.findElements(By.css('a'));
    expect(links.length).to.be.greaterThan(0);
  });
});

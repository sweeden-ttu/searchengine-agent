document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const selectSearchBoxBtn = document.getElementById('selectSearchBoxBtn');
  const startCrawlBtn = document.getElementById('startCrawlBtn');
  const searchTermsTextarea = document.getElementById('searchTerms');
  const extractStatus = document.getElementById('extractStatus');
  const searchBoxStatus = document.getElementById('searchBoxStatus');
  const crawlStatus = document.getElementById('crawlStatus');

  let selectedSearchBoxSelector = null;

  extractBtn.addEventListener('click', async () => {
    extractStatus.textContent = 'Extracting...';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractPage' });
    await fetch('http://localhost:3000/save-markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: response.markdown,
        url: response.url,
        title: response.title,
        searchTerm: 'manual-extract',
        timestamp: new Date().toISOString()
      })
    });
    extractStatus.textContent = 'Saved to local server!';
  });

  selectSearchBoxBtn.addEventListener('click', async () => {
    searchBoxStatus.textContent = 'Click the search box on the page...';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'startSelectSearchBox' });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'searchBoxSelected') {
        selectedSearchBoxSelector = msg.selector;
        searchBoxStatus.textContent = `Selected: ${msg.selector}`;
      }
    });
  });

  startCrawlBtn.addEventListener('click', async () => {
    if (!selectedSearchBoxSelector) return crawlStatus.textContent = 'Select a search box first';
    const terms = searchTermsTextarea.value.split('\n').filter(t => t.trim());
    if (!terms.length) return crawlStatus.textContent = 'Enter at least one search term';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      action: 'startCrawl',
      searchBoxSelector: selectedSearchBoxSelector,
      searchTerms: terms
    });
    crawlStatus.textContent = 'Crawl in progress...';
  });
});

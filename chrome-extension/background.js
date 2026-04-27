chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'openAndCrawl') {
    console.log(`[BACKGROUND TELEMETRY] ${new Date().toISOString()} | OPEN_AND_CRAWL`, { url: msg.url, searchTerm: msg.searchTerm });
    
    chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['lib/turndown.js', 'content.js']
            }, () => {
              chrome.tabs.sendMessage(tab.id, { action: 'extractPage' }, (res) => {
                if (res) {
                  console.log(`[BACKGROUND TELEMETRY] ${new Date().toISOString()} | SENDING_TO_SERVER`, { title: res.title, url: res.url });
                  
                  fetch('http://localhost:3000/save-markdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      markdown: res.markdown,
                      url: res.url,
                      title: res.title,
                      searchTerm: msg.searchTerm,
                      timestamp: new Date().toISOString()
                    })
                  })
                  .then(response => {
                    console.log(`[BACKGROUND TELEMETRY] ${new Date().toISOString()} | SERVER_RESPONSE`, { status: response.status });
                  })
                  .catch(err => {
                    console.error(`[BACKGROUND TELEMETRY] ${new Date().toISOString()} | SERVER_ERROR`, { error: err.message });
                  });
                }
                setTimeout(() => chrome.tabs.remove(tab.id), 2000);
              });
            });
          }, 2000);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'openAndCrawl') {
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

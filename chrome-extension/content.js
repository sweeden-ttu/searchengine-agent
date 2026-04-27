const turndownService = new TurndownService({ headingStyle: 'atx' });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extractPage') {
    sendResponse({
      markdown: turndownService.turndown(document.body.innerHTML),
      title: document.title,
      url: location.href
    });
    return true;
  }

  if (msg.action === 'startSelectSearchBox') {
    const clickHandler = (e) => {
      const selector = getSelector(e.target);
      chrome.runtime.sendMessage({ action: 'searchBoxSelected', selector });
      document.removeEventListener('click', clickHandler, true);
    };
    document.addEventListener('click', clickHandler, true);
  }

  if (msg.action === 'startCrawl') {
    crawlWebsites(msg.searchBoxSelector, msg.searchTerms);
  }
});

function getSelector(el) {
  if (el.id) return `#${el.id}`;
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let sel = el.tagName.toLowerCase();
    if (el.classList.length) sel += `.${Array.from(el.classList).join('.')}`;
    path.unshift(sel);
    el = el.parentNode;
  }
  return path.join(' > ');
}

async function crawlWebsites(searchBoxSelector, terms) {
  const searchBox = document.querySelector(searchBoxSelector);
  if (!searchBox) return;
  
  for (const term of terms) {
    searchBox.value = term;
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    searchBox.closest('form')?.dispatchEvent(new Event('submit', { bubbles: true })) || 
    searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 3000));

    const links = Array.from(document.querySelectorAll('a'))
      .filter(a => a.href && a.href.startsWith('http') && !a.href.startsWith(location.origin))
      .slice(0, 10);

    for (const link of links) {
      chrome.runtime.sendMessage({ 
        action: 'openAndCrawl', 
        url: link.href, 
        searchTerm: term 
      });
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

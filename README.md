# Private Search Engine

A Chrome extension that extracts web pages to markdown, automatically crawls websites based on search terms, and indexes content locally for private search.

## Features

- **Extract Page**: Convert any web page to markdown with one click
- **Crawl Website**: Select a search box, enter search terms, and automatically crawl top results
- **Local Indexing**: All content indexed locally using Lunr.js for fast search
- **Hierarchical Storage**: Markdown files organized by search term and domain
- **Google ADK Integration**: Robust crawling agent for automated web research
- **Chrome DevTools MCP**: Debug extension with Chrome DevTools MCP server (submodule)

## Installation

### Chrome Extension
1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer Mode"
3. Click "Load Unpacked" and select the `chrome-extension` folder

### Local Server
```bash
cd server
npm install
node server.js
```

### Google ADK Agent (Optional)
```bash
cd adk-agent
pip install -r requirements.txt
python crawler_agent.py
```

### Chrome DevTools MCP (for debugging)
```bash
cd chrome-devtools
npm install
npm run build
```

## Usage

1. **Extract Page**: Click extension icon → "Extract Page to Markdown"
2. **Crawl Website**:
   - Navigate to a site with a search box
   - Click extension → "1. Select Search Box" → click the search box
   - Enter search terms (one per line)
   - Click "2. Start Crawl"
3. **Search Indexed Content**: `http://localhost:3000/search?q=your_query`
4. **Browse Files**: `http://localhost:3000/files`

## Architecture

```
private-search-engine/
├── chrome-extension/     # Chrome extension files
├── server/              # Local Express.js server with Lunr indexing
├── adk-agent/           # Google ADK crawler agent
└── chrome-devtools/     # Chrome DevTools MCP server (submodule)
```

## Data Storage

Markdown files are saved hierarchically:
```
server/crawled-data/
├── search-term-1/
│   └── domain_com/
│       └── Page_Title_timestamp.md
└── search-term-2/
    └── another_domain_com/
        └── Another_Page_timestamp.md
```

## License

MIT

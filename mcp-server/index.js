import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { marked } from 'marked';

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'crawled-data');

let searchIndex = null;
let indexedDocs = [];

app.use(bodyParser.json({ limit: '10mb' }));

// Telemetry logging
const telemetryLog = [];
function logTelemetry(direction, source, target, endpoint, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    direction,
    source,
    target,
    endpoint,
    data: data ? JSON.parse(JSON.stringify(data)) : null
  };
  telemetryLog.push(entry);
  console.log(`[TELEMETRY] ${entry.timestamp} | ${direction} | ${source} -> ${target} | ${endpoint}`);
}

// Initialize search index
function initIndex() {
  indexedDocs = [];
  
  function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        walkDir(filePath, fileList);
      } else if (file.endsWith('.md')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  }
  
  try {
    const files = walkDir(DATA_DIR);
    if (files.length > 0) {
      // Dynamic import for lunr
      import('lunr').then(lunr => {
        searchIndex = lunr.default(function() {
          this.field('title', { boost: 10 });
          this.field('content');
          this.field('url');
          this.ref('id');
          
          files.forEach((file, i) => {
            const content = fs.readFileSync(file, 'utf8');
            const metaPath = file.replace('.md', '.json');
            const meta = fs.readJsonSync(metaPath, { throws: false }) || {};
            const doc = { 
              id: i, 
              title: meta.title || path.basename(file), 
              content, 
              url: meta.url || '', 
              searchTerm: meta.searchTerm || '' 
            };
            this.add(doc);
            indexedDocs.push(doc);
          });
        });
        console.log(`Indexed ${files.length} documents`);
      });
    }
  } catch (e) {
    console.log('No existing data to index');
  }
}

// MCP Server - exposes tools for opencode
const mcpTools = {
  extract_page: {
    description: 'Extract content from a web page and convert to markdown',
    parameters: {
      url: { type: 'string', description: 'URL to extract content from' }
    }
  },
  crawl_website: {
    description: 'Crawl a website by searching and extracting top results',
    parameters: {
      searchTerm: { type: 'string', description: 'Search term to crawl' },
      baseUrl: { type: 'string', description: 'Base URL with search functionality' }
    }
  },
  search_index: {
    description: 'Search the local indexed markdown files',
    parameters: {
      query: { type: 'string', description: 'Search query' }
    }
  },
  get_telemetry: {
    description: 'Get telemetry logs of all API calls',
    parameters: {}
  }
};

// MCP endpoint for tool listing
app.get('/mcp/tools', (req, res) => {
  logTelemetry('REQUEST', 'opencode', 'mcp-server', '/mcp/tools');
  res.json({ tools: mcpTools });
});

// Extract page tool
app.post('/mcp/tools/extract_page', async (req, res) => {
  logTelemetry('REQUEST', 'opencode', 'mcp-server', '/mcp/tools/extract_page', req.body);
  
  try {
    const { url } = req.body;
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // Simple HTML to Markdown conversion
    const title = document.title || 'Untitled';
    const bodyText = document.body?.innerText || '';
    
    // Save to file
    const domain = new URL(url).hostname.replace(/\./g, '_');
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
    const dir = path.join(DATA_DIR, 'manual-extract', domain);
    await fs.ensureDir(dir);
    const fileName = `${safeTitle}_${Date.now()}`;
    await fs.writeFile(path.join(dir, `${fileName}.md`), bodyText);
    await fs.writeJson(path.join(dir, `${fileName}.json`), { 
      url, title, searchTerm: 'manual-extract', timestamp: new Date().toISOString() 
    });
    
    logTelemetry('RESPONSE', 'mcp-server', 'opencode', '/mcp/tools/extract_page', { success: true });
    res.json({ success: true, markdown: bodyText, title, url });
  } catch (e) {
    logTelemetry('ERROR', 'mcp-server', 'opencode', '/mcp/tools/extract_page', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Search index tool
app.get('/mcp/tools/search_index', (req, res) => {
  logTelemetry('REQUEST', 'opencode', 'mcp-server', '/mcp/tools/search_index', req.query);
  
  if (!searchIndex) initIndex();
  
  const query = req.query.query || '';
  if (!searchIndex) {
    return res.json({ results: [] });
  }
  
  try {
    const results = searchIndex.search(query);
    const formattedResults = results.map(r => {
      const doc = indexedDocs.find(d => d.id === r.ref);
      return { title: doc.title, url: doc.url, searchTerm: doc.searchTerm };
    });
    
    logTelemetry('RESPONSE', 'mcp-server', 'opencode', '/mcp/tools/search_index', { count: results.length });
    res.json({ results: formattedResults });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Telemetry endpoint
app.get('/telemetry', (req, res) => {
  res.json({
    count: telemetryLog.length,
    logs: telemetryLog.slice(-100)
  });
});

// Save markdown endpoint (for Chrome extension compatibility)
app.post('/save-markdown', async (req, res) => {
  logTelemetry('REQUEST', 'extension', 'server', '/save-markdown', req.body);
  
  try {
    const { markdown, url, title, searchTerm, timestamp } = req.body;
    const domain = new URL(url).hostname.replace(/\./g, '_');
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
    const dir = path.join(DATA_DIR, searchTerm.replace(/[^a-zA-Z0-9]/g, '_'), domain);
    await fs.ensureDir(dir);
    const fileName = `${safeTitle}_${Date.now()}`;
    await fs.writeFile(path.join(dir, `${fileName}.md`), markdown);
    await fs.writeJson(path.join(dir, `${fileName}.json`), { url, title, searchTerm, timestamp });
    
    logTelemetry('RESPONSE', 'server', 'extension', '/save-markdown', { success: true });
    res.json({ success: true, path: path.join(dir, `${fileName}.md`) });
  } catch (e) {
    logTelemetry('ERROR', 'server', 'extension', '/save-markdown', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => { 
  initIndex(); 
  console.log(`Private Search Engine MCP Server running on http://localhost:${PORT}`);
  console.log(`Telemetry endpoint: http://localhost:${PORT}/telemetry`);
});

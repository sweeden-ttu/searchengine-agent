const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const lunr = require('lunr');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'crawled-data');
let searchIndex = null;
let indexedDocs = [];

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
  console.log(`[TELEMETRY] ${entry.timestamp} | ${direction} | ${source} -> ${target} | ${endpoint}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logTelemetry('REQUEST', 'extension', 'server', req.url, {
    method: req.method,
    body: req.method === 'POST' ? req.body : null
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    logTelemetry('RESPONSE', 'server', 'extension', req.url, {
      status: res.statusCode,
      duration: `${duration}ms`,
      body: body ? JSON.parse(JSON.stringify(body)).slice(0, 200) : null
    });
    return originalSend.call(this, body);
  };

  next();
});

app.use(bodyParser.json({ limit: '10mb' }));

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
      searchIndex = lunr(function() {
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
    } else {
      searchIndex = null;
      console.log('No existing data to index');
    }
  } catch (e) {
    searchIndex = null;
    console.log('No existing data to index');
  }
}

app.post('/save-markdown', async (req, res) => {
  try {
    const { markdown, url, title, searchTerm, timestamp } = req.body;
    const domain = new URL(url).hostname.replace(/\./g, '_');
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);
    const dir = path.join(DATA_DIR, searchTerm.replace(/[^a-zA-Z0-9]/g, '_'), domain);
    await fs.ensureDir(dir);
    const fileName = `${safeTitle}_${Date.now()}`;
    await fs.writeFile(path.join(dir, `${fileName}.md`), markdown);
    await fs.writeJson(path.join(dir, `${fileName}.json`), { url, title, searchTerm, timestamp });

    const doc = { 
      id: indexedDocs.length, 
      title, 
      content: markdown, 
      url, 
      searchTerm 
    };
    searchIndex.add(doc);
    indexedDocs.push(doc);
    
    res.json({ success: true, path: path.join(dir, `${fileName}.md`) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/search', (req, res) => {
  if (!searchIndex) initIndex();
  const query = req.query.q || '';
  const results = searchIndex.search(query);
  res.json({ 
    results: results.map(r => {
      const doc = indexedDocs.find(d => d.id === r.ref);
      return { title: doc.title, url: doc.url, searchTerm: doc.searchTerm };
    })
  });
});

app.get('/files', (req, res) => {
  function getFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        files.push({ name: item, type: 'dir', children: getFiles(fullPath) });
      } else if (item.endsWith('.md')) {
        files.push({ name: item, type: 'file', path: fullPath });
      }
    });
    return files;
  }
  try {
    res.json(getFiles(DATA_DIR));
  } catch (e) {
    res.json([]);
  }
});

app.listen(PORT, () => { 
  initIndex(); 
  console.log(`Private Search Engine server running on http://localhost:${PORT}`); 
});

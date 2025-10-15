const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'https://api.app-prg1.zerops.io';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
        return;
      }

      // Inject environment variables into the HTML
      const injectedData = data.replace(
        '<script>',
        `<script>
    // Environment variables injected by server
    window.ENV = {
      BACKEND_URL: '${BACKEND_URL}',
      ACCESS_TOKEN: '${ACCESS_TOKEN}',
      CLIENT_ID: '${CLIENT_ID}'
    };
    `
      );

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(injectedData);
    });
  } else if (req.url === '/config') {
    // API endpoint to get current config
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      backendUrl: BACKEND_URL,
      hasAccessToken: !!ACCESS_TOKEN,
      hasClientId: !!CLIENT_ID
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Zerops WebSocket Subscription Test Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Configuration:');
  console.log(`   Backend URL:   ${BACKEND_URL}`);
  console.log(`   Access Token:  ${ACCESS_TOKEN ? `${ACCESS_TOKEN.substring(0, 20)}...` : '❌ Not set'}`);
  console.log(`   Client ID:     ${CLIENT_ID || '❌ Not set'}`);
  console.log('');

  if (!ACCESS_TOKEN || !CLIENT_ID) {
    console.log('⚠️  WARNING: Missing environment variables!');
    console.log('   You can still run the test by entering values in the UI,');
    console.log('   or set them via environment variables:');
    console.log('');
    console.log('   export ACCESS_TOKEN="your-token"');
    console.log('   export CLIENT_ID="your-client-id"');
    console.log('   node server.js');
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
});

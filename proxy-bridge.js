// proxy-bridge.js
// Reddit Proxy Bridge for Google Apps Script + DataImpulse
// Ready to deploy to Railway, Heroku, or any Node.js host

const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// DataImpulse Configuration
const PROXY_CONFIG = {
  host: process.env.PROXY_HOST || 'gw.dataimpulse.com',
  port: process.env.PROXY_PORT || '823',
  username: process.env.PROXY_USERNAME || '6bedabce678df1c53167',
  password: process.env.PROXY_PASSWORD || 'e9d405b46163e5ee',
  country: process.env.PROXY_COUNTRY || 'us'
};

// Security: API key to prevent unauthorized access
const API_KEY = process.env.API_KEY || 'reddit-tracker-2024';

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Reddit Proxy Bridge',
    proxy: `${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`,
    country: PROXY_CONFIG.country
  });
});

// Test endpoint - check if proxy is working
app.get('/test', (req, res) => {
  res.json({
    message: 'To test the proxy, make a POST request to /fetch with a Reddit URL',
    example: {
      method: 'POST',
      url: '/fetch',
      headers: { 'X-API-Key': 'your-api-key' },
      body: { url: 'https://www.reddit.com/r/test/comments/example.json' }
    }
  });
});

// Main proxy endpoint
app.post('/fetch', async (req, res) => {
  try {
    // Check API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
      console.log('Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required in request body' });
    }

    // Validate URL is a Reddit URL
    if (!url.includes('reddit.com')) {
      return res.status(400).json({ error: 'Only Reddit URLs are allowed' });
    }

    console.log(`[${new Date().toISOString()}] Fetching: ${url}`);

    // Build proxy URL with authentication
    // DataImpulse format: username:password@host:port
    let proxyUsername = PROXY_CONFIG.username;
    
    // Add country targeting if specified
    if (PROXY_CONFIG.country) {
      // DataImpulse format: username-country-us:password
      proxyUsername = `${PROXY_CONFIG.username}-country-${PROXY_CONFIG.country}`;
    }

    const proxyUrl = `http://${proxyUsername}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;

    // Create proxy agent
    const agent = new HttpsProxyAgent(proxyUrl);

    // Make request through proxy
    const response = await axios.get(url, {
      httpsAgent: agent,
      httpAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000,  // 30 second timeout
      validateStatus: () => true,  // Don't throw on any status code
      maxRedirects: 5
    });

    console.log(`[${new Date().toISOString()}] Response: ${response.status}`);

    // Return the response
    res.status(response.status).json({
      status: response.status,
      data: response.data,
      headers: {
        'content-type': response.headers['content-type']
      }
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Check for specific proxy errors
    if (error.message.includes('ECONNREFUSED')) {
      return res.status(502).json({ 
        error: 'Cannot connect to proxy server',
        details: 'Check proxy host and port'
      });
    }
    
    if (error.message.includes('407')) {
      return res.status(502).json({ 
        error: 'Proxy authentication failed',
        details: 'Check proxy username and password'
      });
    }
    
    if (error.message.includes('ETIMEDOUT')) {
      return res.status(504).json({ 
        error: 'Request timeout',
        details: 'Proxy or Reddit took too long to respond'
      });
    }

    res.status(500).json({
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Reddit Proxy Bridge`);
  console.log(`========================================`);
  console.log(`Server running on port: ${PORT}`);
  console.log(`Proxy: ${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`);
  console.log(`Country: ${PROXY_CONFIG.country}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`========================================`);
  console.log(`Ready to proxy Reddit requests!`);
  console.log(`========================================`);
});

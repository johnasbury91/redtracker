// proxy-bridge.js
// Simple Node.js proxy bridge for Google Apps Script + DataImpulse
// Deploy this to Heroku, Vercel, Railway, or your own server

const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// Configuration - SET THESE FROM ENVIRONMENT VARIABLES
const PROXY_HOST = process.env.PROXY_HOST || 'gate.dataimpulse.com';
const PROXY_PORT = process.env.PROXY_PORT || '823';
const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;
const PROXY_COUNTRY = process.env.PROXY_COUNTRY || 'us';  // Optional

// API key for security (prevent abuse)
const API_KEY = process.env.API_KEY || 'your-secret-key-here';

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Reddit Proxy Bridge' });
});

// Main proxy endpoint
app.post('/fetch', async (req, res) => {
  try {
    // Check API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Build proxy URL with authentication
    let proxyUsername = PROXY_USERNAME;
    
    // Add country targeting if specified
    if (PROXY_COUNTRY) {
      proxyUsername = `${PROXY_USERNAME}-country-${PROXY_COUNTRY}`;
    }

    const proxyUrl = `http://${proxyUsername}:${PROXY_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}`;
    
    console.log(`Fetching: ${url}`);
    console.log(`Via proxy: ${PROXY_HOST}:${PROXY_PORT}`);

    // Create proxy agent
    const agent = new HttpsProxyAgent(proxyUrl);

    // Make request through proxy
    const response = await axios.get(url, {
      httpsAgent: agent,
      httpAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 30000,  // 30 second timeout
      validateStatus: () => true  // Don't throw on any status code
    });

    // Return the response
    res.status(response.status).json({
      status: response.status,
      data: response.data,
      headers: response.headers
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy bridge running on port ${PORT}`);
  console.log(`Proxy: ${PROXY_HOST}:${PROXY_PORT}`);
});

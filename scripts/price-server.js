const http = require('http');
const TradingView = require('@mathieuc/tradingview');

const PORT = process.env.PORT || 3456;

/**
 * Simple HTTP server that fetches ETF prices from TradingView
 *
 * Usage: GET /?symbol=LSE:ISPY
 * Returns: { symbol, price, timestamp }
 */

async function getPrice(symbol) {
  return new Promise((resolve, reject) => {
    const client = new TradingView.Client();
    const chart = new client.Session.Chart();

    const timeout = setTimeout(() => {
      client.end();
      reject(new Error('Timeout'));
    }, 15000);

    chart.setMarket(symbol, { timeframe: 'D' });

    chart.onError((...err) => {
      clearTimeout(timeout);
      client.end();
      reject(new Error(err.join(' ')));
    });

    chart.onUpdate(() => {
      if (!chart.periods[0]) return;

      clearTimeout(timeout);
      const result = {
        symbol: symbol,
        price: chart.periods[0].close,
        timestamp: new Date().toISOString()
      };
      chart.delete();
      client.end();
      resolve(result);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/price') {
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing symbol parameter' }));
      return;
    }

    try {
      const result = await getPrice(symbol);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url.pathname === '/prices') {
    // Fetch multiple prices
    const symbolsParam = url.searchParams.get('symbols');

    if (!symbolsParam) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing symbols parameter (comma-separated)' }));
      return;
    }

    const symbols = symbolsParam.split(',');
    const results = [];

    for (const symbol of symbols) {
      try {
        const result = await getPrice(symbol.trim());
        results.push(result);
        console.log(`Fetched ${symbol}: ${result.price}`);
      } catch (err) {
        results.push({ symbol: symbol.trim(), error: err.message });
        console.error(`Error fetching ${symbol}: ${err.message}`);
      }
      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    res.end(JSON.stringify({ results }));
    return;
  }

  // Health check
  if (url.pathname === '/health') {
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TradingView Price Server running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /price?symbol=LSE:ISPY`);
  console.log(`  GET /prices?symbols=LSE:ISPY,LSE:SMGB,LSE:GSPX`);
  console.log(`  GET /health`);
});

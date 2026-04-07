const http = require('http');
const TradingView = require('@mathieuc/tradingview');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3456;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('Supabase connected');
} else {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY not set — /update-prices disabled');
}

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

async function updateAllPrices() {
  if (!supabase) throw new Error('Supabase not configured');

  const { data: etfs, error } = await supabase
    .from('etfs')
    .select('id, ticker, exchange');

  if (error) throw new Error(`Failed to fetch ETFs: ${error.message}`);
  if (!etfs.length) return { updated: 0, errors: [] };

  const results = { updated: 0, errors: [] };

  for (const etf of etfs) {
    const tvSymbol = `${etf.exchange}:${etf.ticker}`;
    try {
      const priceData = await getPrice(tvSymbol);
      const { error: updateError } = await supabase
        .from('etfs')
        .update({
          current_price: priceData.price,
          price_updated_at: priceData.timestamp
        })
        .eq('id', etf.id);

      if (updateError) {
        results.errors.push({ ticker: etf.ticker, error: updateError.message });
        console.error(`DB update failed for ${etf.ticker}: ${updateError.message}`);
      } else {
        results.updated++;
        console.log(`Updated ${etf.ticker}: ${priceData.price}`);
      }
    } catch (err) {
      results.errors.push({ ticker: etf.ticker, error: err.message });
      console.error(`Price fetch failed for ${tvSymbol}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/update-prices') {
    if (!supabase) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Supabase not configured' }));
      return;
    }
    try {
      const results = await updateAllPrices();
      res.end(JSON.stringify(results));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

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
      await new Promise(r => setTimeout(r, 500));
    }

    res.end(JSON.stringify({ results }));
    return;
  }

  if (url.pathname === '/health') {
    res.end(JSON.stringify({ status: 'ok', supabase: !!supabase }));
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
  console.log(`  GET /update-prices        (reads ETFs from Supabase, fetches & writes prices)`);
  console.log(`  GET /health`);
});

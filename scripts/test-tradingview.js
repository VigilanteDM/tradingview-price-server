const TradingView = require('@mathieuc/tradingview');

/**
 * Test script to fetch ETF price from TradingView
 * Tests with SPY (S&P 500 ETF) as a sample
 */

const client = new TradingView.Client();
const chart = new client.Session.Chart();

// Test with SPY ETF - using AMEX exchange
chart.setMarket('AMEX:SPY', {
  timeframe: 'D',
});

chart.onError((...err) => {
  console.error('Chart error:', ...err);
  client.end();
});

chart.onSymbolLoaded(() => {
  console.log('Symbol loaded successfully!');
  console.log('Description:', chart.infos.description);
  console.log('Exchange:', chart.infos.exchange);
  console.log('Currency:', chart.infos.currency_id);
});

chart.onUpdate(() => {
  if (!chart.periods[0]) return;

  const latestPeriod = chart.periods[0];
  console.log('\n--- Latest Price Data ---');
  console.log('Symbol: SPY');
  console.log('Close Price:', latestPeriod.close);
  console.log('Open:', latestPeriod.open);
  console.log('High:', latestPeriod.high);
  console.log('Low:', latestPeriod.low);
  console.log('Volume:', latestPeriod.volume);
  console.log('Time:', new Date(latestPeriod.time * 1000).toISOString());

  // Close after getting data
  console.log('\nTest successful! Closing connection...');
  clearTimeout(timeout);
  chart.delete();
  client.end();
});

// Timeout after 30 seconds if no response
const timeout = setTimeout(() => {
  console.error('Timeout: No response received');
  client.end();
  process.exit(1);
}, 30000);

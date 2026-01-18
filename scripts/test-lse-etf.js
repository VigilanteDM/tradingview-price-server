const TradingView = require('@mathieuc/tradingview');

/**
 * Test fetching LSE ETF price from TradingView
 */

const client = new TradingView.Client();
const chart = new client.Session.Chart();

// Test with ISPY on LSE
chart.setMarket('LSE:ISPY', {
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
  console.log('Symbol: LSE:ISPY');
  console.log('Close Price:', latestPeriod.close);
  console.log('Time:', new Date(latestPeriod.time * 1000).toISOString());

  console.log('\nTest successful! Closing connection...');
  clearTimeout(timeout);
  chart.delete();
  client.end();
});

const timeout = setTimeout(() => {
  console.error('Timeout: No response received');
  client.end();
  process.exit(1);
}, 30000);

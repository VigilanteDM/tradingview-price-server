/**
 * Fetch ETF list from Airtable
 */

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || 'YOUR_AIRTABLE_TOKEN';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'YOUR_BASE_ID';
const TABLE_NAME = 'ETF';

async function fetchETFList() {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', response.status, error);
    return;
  }

  const data = await response.json();

  console.log('=== ETF Records from Airtable ===\n');
  console.log('Total records:', data.records.length);
  console.log('\nFields available:', Object.keys(data.records[0]?.fields || {}));
  console.log('\n--- Records ---\n');

  data.records.forEach((record, i) => {
    console.log(`${i + 1}.`, JSON.stringify(record.fields));
  });
}

fetchETFList();

// index.js
require('dotenv').config();
const express = require('express');
const rp = require('request-promise');

const app = express();
app.use(express.json());

const SB_KEY = process.env.SCRAPINGBEE_API_KEY;
const PORT = process.env.PORT || 3001;

// ---- Helpers to call ScrapingBee ----

// Walmart search helper
async function searchWalmart(itemName) {
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/walmart/search',
    qs: {
      api_key: SB_KEY,
      light_request: 'true',
      query: itemName,
      device: 'desktop',
      sort_by: 'best_match'
    },
    json: true
  };
  return rp(options);
}

// Amazon search helper
async function searchAmazon(itemName) {
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/amazon/search',
    qs: {
      api_key: SB_KEY,
      query: itemName,
      light_request: 'true',
      sort_by: 'bestsellers',
      domain: 'com',
      start_page: '1',
      pages: '1'
    },
    json: true
  };
  return rp(options);
}

// ---- Extract a single top offer from raw JSON ----
// IMPORTANT: You must adjust this based on the real structure ScrapingBee returns.
function topOfferFrom(source, data) {
  // Example assumption: data.items is an array of products
  const items = (data && data.items) || [];
  if (!items.length) return null;

  const first = items[0];

  // Adjust these keys after inspecting one real response
  const title =
    first.title ||
    first.name ||
    first.product_name ||
    'Unknown item';

  const price =
    first.price ||
    first.current_price ||
    first.price_value ||
    null;

  const currency =
    first.currency ||
    first.currency_code ||
    'USD';

  return {
    source,
    title,
    price,
    currency
  };
}

// ---- /best-prices endpoint for the iOS app ----

app.post('/best-prices', async (req, res) => {
  try {
    const { items = [] } = req.body;   // e.g. ["Coffee","Sugar"]
    const results = [];

    for (const name of items) {
      // Fetch in parallel
      const [walmartData, amazonData] = await Promise.all([
        searchWalmart(name),
        searchAmazon(name)
      ]);

      // Uncomment once to inspect real structure, then comment again
      // console.dir(walmartData, { depth: 1 });
      // console.dir(amazonData, { depth: 1 });

      const bestWalmart = topOfferFrom('Walmart', walmartData);
      const bestAmazon  = topOfferFrom('Amazon',  amazonData);

      results.push({
        item: name,
        offers: [bestWalmart, bestAmazon].filter(Boolean)
      });
    }

    const lines = results.map(r => {
      const offers = r.offers || [];
      if (!offers.length) return `• ${r.item}: no offers found`;

      const parts = offers.map(o =>
        `${o.source} ~ ${o.price ?? "?"} ${o.currency} (${o.title})`
      );
      return `• ${r.item}: ` + parts.join(' | ');
    });

    res.json({
      answer: "Here are some example prices:\n" + lines.join('\n'),
      prices: results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: 'Error fetching prices.' });
  }
});

// ---- Start server ----

app.listen(PORT, () => {
  console.log(`Best-price service listening on http://localhost:${PORT}`);
});

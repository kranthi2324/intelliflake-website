// index.js
require('dotenv').config();
const express = require('express');
const rp = require('request-promise');

const app = express();
app.use(express.json());

const SB_KEY = process.env.SCRAPINGBEE_API_KEY;
const PORT = process.env.PORT || 3001;

if (!SB_KEY) {
  console.warn('Warning: SCRAPINGBEE_API_KEY is not set. Price calls will fail.');
}

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
// Adjust keys once you’ve inspected a real ScrapingBee response.
function topOfferFrom(source, data) {
  const products = (data && data.products) || [];  // adjust this
  if (!products.length) return null;

  const first = products[0];

  const title =
    first.title ||
    first.name ||
    first.product_name ||
    'Unknown item';

  const price =
    first.price_value ||  // or whatever you see in JSON
    first.price ||
    null;

  const currency =
    first.currency ||
    first.currency_code ||
    'USD';

  return { source, title, price, currency };
}


// ---- /best-prices endpoint for the iOS app ----

app.post('/best-prices', async (req, res) => {
  try {
    const { items = [] } = req.body; // e.g. ["Coffee","Sugar"]
    const results = [];

      for (const name of items) {
        try {
          const [walmartData, amazonData] = await Promise.all([
            searchWalmart(name),
            searchAmazon(name)
          ]);

          // TEMP: inspect real structure from ScrapingBee
          console.log('=== DEBUG for', name, '===');
          console.dir(walmartData, { depth: 2 });
          console.dir(amazonData, { depth: 2 });

          const bestWalmart = topOfferFrom('Walmart', walmartData);
          const bestAmazon  = topOfferFrom('Amazon',  amazonData);

          results.push({
            item: name,
            offers: [bestWalmart, bestAmazon].filter(Boolean)
          });
        } catch (itemErr) {
          console.error('Error fetching prices for item:', name, itemErr);
          results.push({ item: name, offers: [] });
        }
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
    res.status(500).json({ answer: 'Error fetching prices.', prices: [] });
  }
});

// ---- Start server ----

app.listen(PORT, () => {
  console.log(`Best-price service listening on http://localhost:${PORT}`);
});

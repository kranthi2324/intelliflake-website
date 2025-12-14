// api/best-prices.js
const rp = require('request-promise');

const SB_KEY = process.env.SCRAPINGBEE_API_KEY;

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

// Simplified offer extraction; adjust keys as needed
function topOfferFrom(source, data) {
  const items = (data && data.items) || [];
  if (!items.length) return null;

  const first = items[0];

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

  return { source, title, price, currency };
}

// Vercel serverless handler
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { items = [] } = req.body || {};
    const results = [];

    for (const name of items) {
      try {
        const [walmartData, amazonData] = await Promise.all([
          searchWalmart(name),
          searchAmazon(name)
        ]);

        const bestWalmart = topOfferFrom('Walmart', walmartData);
        const bestAmazon  = topOfferFrom('Amazon',  amazonData);

        results.push({
          item: name,
          offers: [bestWalmart, bestAmazon].filter(Boolean)
        });
      } catch (e) {
        console.error('Item error', name, e);
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

    res.status(200).json({
      answer: "Here are some example prices:\n" + lines.join('\n'),
      prices: results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: 'Error fetching prices.', prices: [] });
  }
};

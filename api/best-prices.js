import rp from 'request-promise';

const SB_KEY = process.env.SCRAPINGBEE_API_KEY;

async function searchWalmart(itemName, zipCode = '92591') {
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/walmart/search',
    qs: {
      api_key: SB_KEY,
      query: itemName,
      light_request: 'true',
      sort_by: 'best_match',
      device: 'desktop',
      delivery_zip: zipCode,
    },
    json: true,
  };
  return rp(options);
}

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
      pages: '1',
    },
    json: true,
  };
  return rp(options);
}

function topOfferFrom(source, data) {
  const items =
    data.products ||   // Walmart search
    data.items ||      // fallback if some endpoint uses items
    data.results ||    // generic fallback
    [];

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
    first.offer_price ||
    null;

  const currency =
    first.currency ||
    first.currency_code ||
    'USD';

  // 🔗 EXTRACT URL - Add product URL for clickable links
  const url = 
    first.url ||
    first.product_url ||
    first.link ||
    (first.asin ? `https://www.amazon.com/dp/${first.asin}` : null) ||
    (first.product_id && source === 'Walmart' 
      ? `https://www.walmart.com/ip/${first.product_id}` 
      : null);

  return { source, title, price, currency, url };
}

export default async function handler(req, res) {
  console.log('best-prices hit', req.method, req.url);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { items = [], zipCode = '92591' } = req.body || {};
    
    console.log(`🔍 Processing ${items.length} items for ZIP: ${zipCode}`);
    
    const results = [];

    for (const name of items) {
      try {
        const [walmartData, amazonData] = await Promise.all([
          searchWalmart(name, zipCode),
          searchAmazon(name),
        ]);
        
        console.log('BEST-PRICES ITEM:', name);
        console.log('WALMART RAW:', JSON.stringify(walmartData, null, 2));
        console.log('AMAZON RAW:', JSON.stringify(amazonData, null, 2));
        
        const bestWalmart = topOfferFrom('Walmart', walmartData);
        const bestAmazon = topOfferFrom('Amazon', amazonData);

        results.push({
          item: name,
          offers: [bestWalmart, bestAmazon].filter(Boolean),
        });
      } catch (e) {
        console.error('Item error', name, e);
        results.push({ item: name, offers: [] });
      }
    }

    // 🔗 Build response with clickable URLs
    const lines = results.map((r) => {
      const offers = r.offers || [];
      if (!offers.length) return `• ${r.item}: no offers found`;
      
      const parts = offers.map((o) => {
        const priceStr = `${o.price ?? '?'} ${o.currency}`;
        const titleStr = o.title || 'Unknown';
        
        // Include URL in the text so it can be detected and made clickable
        if (o.url) {
          return `${o.source}: ${priceStr}\n  ${titleStr}\n  ${o.url}`;
        } else {
          return `${o.source}: ${priceStr} (${titleStr})`;
        }
      });
      
      return `• **${r.item}**:\n` + parts.join('\n\n');
    });

    res.status(200).json({
      answer: 'Here are the best prices I found:\n\n' + lines.join('\n\n'),
      prices: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: 'Error fetching prices.', prices: [] });
  }
}

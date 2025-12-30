import rp from 'request-promise';

const SB_KEY = process.env.SCRAPINGBEE_API_KEY;

/**
 * Search Walmart via ScrapingBee
 */
async function searchWalmart(itemName, zipCode = '92591') {
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/walmart/search',
    qs: {
      api_key: SB_KEY,
      search_query: itemName, // specific to Walmart API
      sort: 'best_match',
      device: 'desktop',
      customer_zip: zipCode, // specific to Walmart API
    },
    json: true,
  };
  return rp(options);
}

/**
 * Search Amazon via ScrapingBee
 */
async function searchAmazon(itemName) {
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/amazon/search',
    qs: {
      api_key: SB_KEY,
      search_query: itemName, // specific to Amazon API
      sort: 'relevanceblender', // or 'bestsellers'
      domain: 'com',
    },
    json: true,
  };
  return rp(options);
}

/**
 * Extract the best offer from the API response
 * Handles different field names (organic_results, items, products)
 * and constructs a valid URL if one is missing.
 */
function topOfferFrom(source, data) {
  // 1. Locate the items array. ScrapingBee structure varies slightly.
  const items =
    data.organic_results || // Common for Amazon
    data.items ||           // Common for Walmart
    data.products ||        // Fallback
    data.results ||         // Fallback
    [];

  if (!items.length) return null;

  const first = items[0];

  // 2. Extract Title
  const title =
    first.title ||
    first.name ||
    first.product_name ||
    'Unknown item';

  // 3. Extract Price
  // Sometimes price is an object { value: 10.99, currency: "USD" }
  // Sometimes it is a raw number or string.
  let price = null;
  let currency = 'USD';

  if (typeof first.price === 'object' && first.price !== null) {
    price = first.price.value || first.price.raw;
    currency = first.price.currency || 'USD';
  } else {
    price =
      first.price ||
      first.current_price ||
      first.price_value ||
      first.offer_price;
    
    currency = first.currency || first.currency_code || 'USD';
  }

  // 4. Extract or Construct URL
  // We check multiple fields because parsers change.
  const url = 
    first.url ||
    first.product_url ||
    first.productUrl ||      // common camelCase
    first.productPageUrl ||  // specific to some Walmart parsers
    first.canonicalUrl ||    // specific to some parsers
    first.link ||
    // Fallback: Construct Amazon URL from ASIN
    (first.asin ? `https://www.amazon.com/dp/${first.asin}` : null) ||
    // Fallback: Construct Walmart URL from Item ID
    ((first.usItemId || first.product_id) && source === 'Walmart' 
      ? `https://www.walmart.com/ip/${first.usItemId || first.product_id}` 
      : null);

  return { source, title, price, currency, url };
}

/**
 * Main Handler
 */
export default async function handler(req, res) {
  console.log('best-prices hit', req.method);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { items = [], zipCode = '92591' } = req.body || {};
    
    console.log(`🔍 Processing ${items.length} items for ZIP: ${zipCode}`);
    
    const results = [];

    // Process items in sequence (or Promise.all for parallel)
    for (const name of items) {
      try {
        // Run searches in parallel for speed
        const [walmartData, amazonData] = await Promise.all([
          searchWalmart(name, zipCode).catch(e => ({ error: e.message })),
          searchAmazon(name).catch(e => ({ error: e.message })),
        ]);
        
        // Debug logs (optional - check your Vercel logs)
        // console.log(`Results for ${name}:`, { 
        //   walmart: walmartData.items?.length || walmartData.organic_results?.length || 0,
        //   amazon: amazonData.items?.length || amazonData.organic_results?.length || 0 
        // });

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

    // 5. Build Response string with Markdown Links
    const lines = results.map((r) => {
      const offers = r.offers || [];
      
      if (!offers.length) {
        return `• **${r.item}**: No offers found.`;
      }
      
      const parts = offers.map((o) => {
        const priceStr = o.price ? `$${o.price}` : 'Check Price';
        const titleStr = o.title || 'View Item';
        
        // MARKDOWN: [Link Title](URL)
        if (o.url) {
          // This creates a clickable link in SwiftUI/Markdown
          return `**${o.source}**: ${priceStr}\n[${titleStr}](${o.url})`;
        } else {
          return `**${o.source}**: ${priceStr}\n${titleStr}`;
        }
      });
      
      return `• **${r.item}**:\n` + parts.join('\n\n');
    });

    const finalAnswer = lines.length > 0 
      ? 'Here are the best prices I found:\n\n' + lines.join('\n\n')
      : 'I could not find any price data at the moment.';

    res.status(200).json({
      answer: finalAnswer,
      prices: results,
    });

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ answer: 'Error fetching prices.', prices: [] });
  }
}

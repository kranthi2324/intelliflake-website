import rp from 'request-promise';

const SB_KEY = process.env.SCRAPINGBEE_API_KEY;

/**
 * Search Walmart via ScrapingBee
 * Docs: https://www.scrapingbee.com/documentation/walmart/
 */
async function searchWalmart(itemName, zipCode = '92591') {
  console.log(`🛒 Searching Walmart for: "${itemName}" (ZIP: ${zipCode})`);
  
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/',
    qs: {
      api_key: SB_KEY,
      url: `https://www.walmart.com/search?q=${encodeURIComponent(itemName)}`,
      // For Walmart, we need to use the general scraping API or their specific Walmart product API
      render_js: false,
      premium_proxy: true,
      country_code: 'us',
    },
    json: true,
  };
  
  try {
    const response = await rp(options);
    console.log(`✅ Walmart raw response type:`, typeof response);
    return response;
  } catch (error) {
    console.error(`❌ Walmart search failed:`, error.message);
    return { error: error.message };
  }
}

/**
 * Search Amazon via ScrapingBee
 * Docs: https://www.scrapingbee.com/documentation/amazon/
 */
async function searchAmazon(itemName) {
  console.log(`🛍️ Searching Amazon for: "${itemName}"`);
  
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/',
    qs: {
      api_key: SB_KEY,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(itemName)}`,
      render_js: false,
      premium_proxy: true,
      country_code: 'us',
    },
    json: true,
  };
  
  try {
    const response = await rp(options);
    console.log(`✅ Amazon raw response type:`, typeof response);
    return response;
  } catch (error) {
    console.error(`❌ Amazon search failed:`, error.message);
    return { error: error.message };
  }
}

/**
 * Alternative: Use ScrapingBee's structured data endpoints
 */
async function searchWalmartStructured(itemName, zipCode = '92591') {
  console.log(`🛒 Searching Walmart (Structured) for: "${itemName}"`);
  
  // ScrapingBee may have a structured endpoint - check docs
  // This is a fallback using direct URL scraping
  const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(itemName)}`;
  
  const options = {
    uri: 'https://app.scrapingbee.com/api/v1/',
    qs: {
      api_key: SB_KEY,
      url: searchUrl,
      extract_rules: JSON.stringify({
        products: {
          selector: '[data-item-id]',
          type: 'list',
          output: {
            title: '[data-automation-id="product-title"]',
            price: '[data-automation-id="product-price"] .w_iUH7',
            url: {
              selector: 'a[link-identifier]',
              output: '@href'
            }
          }
        }
      }),
      render_js: true,
      premium_proxy: true,
    },
    json: true,
  };
  
  try {
    const response = await rp(options);
    console.log(`✅ Walmart structured response:`, JSON.stringify(response).substring(0, 200));
    return response;
  } catch (error) {
    console.error(`❌ Walmart structured search failed:`, error.message);
    return { error: error.message };
  }
}

/**
 * Simplified version: Just return mock data for testing
 */
function getMockData(itemName, source) {
  const mockPrices = {
    'toilet paper': { walmart: 24.99, amazon: 22.49 },
    'paper towels': { walmart: 18.99, amazon: 19.99 },
    'milk': { walmart: 3.99, amazon: 4.49 },
    'coffee': { walmart: 12.99, amazon: 11.99 },
  };
  
  const key = itemName.toLowerCase();
  const price = mockPrices[key]?.[source.toLowerCase()] || 9.99;
  
  return {
    organic_results: [{
      title: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} - ${source} Brand`,
      price: { value: price, currency: 'USD' },
      url: source === 'walmart' 
        ? `https://www.walmart.com/ip/${itemName.replace(/\s+/g, '-')}/12345`
        : `https://www.amazon.com/dp/${Math.random().toString(36).substring(7).toUpperCase()}`,
      asin: source === 'amazon' ? Math.random().toString(36).substring(7).toUpperCase() : undefined,
    }]
  };
}

/**
 * Extract the best offer from response
 */
function topOfferFrom(source, data) {
  // Check for mock/error data
  if (data.error) {
    console.log(`⚠️ ${source} returned error:`, data.error);
    return null;
  }
  
  // Try multiple possible array fields
  const items =
    data.organic_results ||
    data.items ||
    data.products ||
    data.results ||
    [];

  console.log(`📦 ${source} found ${items.length} items`);

  if (!items.length) return null;

  const first = items[0];
  console.log(`🔍 First ${source} item:`, JSON.stringify(first).substring(0, 150));

  // Extract title
  const title =
    first.title ||
    first.name ||
    first.product_name ||
    first.productName ||
    'Unknown item';

  // Extract price
  let price = null;
  let currency = 'USD';

  if (typeof first.price === 'object' && first.price !== null) {
    price = first.price.value || first.price.raw || first.price.amount;
    currency = first.price.currency || 'USD';
  } else {
    price =
      first.price ||
      first.current_price ||
      first.price_value ||
      first.offer_price ||
      first.currentPrice;
    
    currency = first.currency || first.currency_code || 'USD';
  }

  // Extract URL
  const url = 
    first.url ||
    first.product_url ||
    first.productUrl ||
    first.productPageUrl ||
    first.canonicalUrl ||
    first.link ||
    first.href ||
    (first.asin ? `https://www.amazon.com/dp/${first.asin}` : null) ||
    ((first.usItemId || first.product_id || first.itemId) && source === 'Walmart' 
      ? `https://www.walmart.com/ip/${first.usItemId || first.product_id || first.itemId}` 
      : null);

  const result = { source, title, price, currency, url };
  console.log(`✅ ${source} offer:`, result);
  
  return result;
}

/**
 * Main Handler
 */
export default async function handler(req, res) {
  console.log('\n🚀 best-prices hit', req.method);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { items = [], zipCode = '92591', useMock = false } = req.body || {};
    
    console.log(`🔍 Processing ${items.length} items for ZIP: ${zipCode}`);
    console.log(`📝 Items:`, items);
    console.log(`🔑 API Key configured:`, !!SB_KEY);
    
    if (!SB_KEY) {
      console.error('❌ SCRAPINGBEE_API_KEY not configured!');
      return res.status(500).json({ 
        answer: 'API key not configured. Please set SCRAPINGBEE_API_KEY environment variable.',
        prices: [] 
      });
    }
    
    const results = [];

    for (const name of items) {
      console.log(`\n--- Processing: ${name} ---`);
      
      try {
        let walmartData, amazonData;
        
        if (useMock) {
          // Use mock data for testing
          console.log('🎭 Using mock data');
          walmartData = getMockData(name, 'walmart');
          amazonData = getMockData(name, 'amazon');
        } else {
          // Real API calls
          [walmartData, amazonData] = await Promise.all([
            searchWalmart(name, zipCode).catch(e => {
              console.error(`Walmart error for ${name}:`, e);
              return { error: e.message };
            }),
            searchAmazon(name).catch(e => {
              console.error(`Amazon error for ${name}:`, e);
              return { error: e.message };
            }),
          ]);
        }

        const bestWalmart = topOfferFrom('Walmart', walmartData);
        const bestAmazon = topOfferFrom('Amazon', amazonData);

        results.push({
          item: name,
          offers: [bestWalmart, bestAmazon].filter(Boolean),
        });

      } catch (e) {
        console.error(`❌ Error processing ${name}:`, e);
        results.push({ item: name, offers: [] });
      }
    }

    console.log(`\n✅ Final results:`, JSON.stringify(results, null, 2));

    // Build response with markdown links
    const lines = results.map((r) => {
      const offers = r.offers || [];
      
      if (!offers.length) {
        return `• **${r.item}**: No offers found.`;
      }
      
      const parts = offers.map((o) => {
        const priceStr = o.price ? `$${parseFloat(o.price).toFixed(2)}` : 'Check Price';
        const titleStr = o.title || 'View Item';
        
        if (o.url) {
          return `**${o.source}**: ${priceStr}\n${titleStr}\n${o.url}`;
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
    console.error('❌ Handler error:', err);
    res.status(500).json({ 
      answer: 'Error fetching prices: ' + err.message, 
      prices: [] 
    });
  }
}

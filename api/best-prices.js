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
    'eggs': { walmart: 5.99, amazon: 6.49 },
    'bread': { walmart: 2.99, amazon: 3.49 },
    'butter': { walmart: 4.99, amazon: 5.49 },
    'cheese': { walmart: 7.99, amazon: 8.49 },
  };
  
  const key = itemName.toLowerCase();
  const price = mockPrices[key]?.[source.toLowerCase()] || 9.99;
  
  // Capitalize first letter of item name
  const formattedItemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
  
  // Proper source capitalization
  const formattedSource = source === 'walmart' || source === 'Walmart' ? 'Walmart' : 'Amazon';
  
  return {
    organic_results: [{
      title: `${formattedItemName} - ${formattedSource} Brand`,
      price: { value: price, currency: 'USD' },
      url: source.toLowerCase() === 'walmart'
        ? `https://www.walmart.com/ip/${itemName.replace(/\s+/g, '-')}/12345`
        : `https://www.amazon.com/dp/${Math.random().toString(36).substring(7).toUpperCase()}`,
      asin: source.toLowerCase() === 'amazon' ? Math.random().toString(36).substring(7).toUpperCase() : undefined,
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
    data.products ||  // From structured extraction
    data.items ||
    data.results ||
    [];

  console.log(`📦 ${source} found ${items.length} items`);

  if (!items.length) {
    console.log(`⚠️ ${source} response structure:`, Object.keys(data));
    return null;
  }

  const first = items[0];
  console.log(`🔍 First ${source} item:`, JSON.stringify(first).substring(0, 200));

  // Extract title
  const title =
    first.title ||
    first.name ||
    first.product_name ||
    first.productName ||
    'Unknown item';

  // Extract price - handle various formats
  let price = null;
  let currency = 'USD';

  if (typeof first.price === 'object' && first.price !== null) {
    price = first.price.value || first.price.raw || first.price.amount;
    currency = first.price.currency || 'USD';
  } else if (typeof first.price === 'string') {
    // Parse string price like "$12.99"
    const priceMatch = first.price.match(/[\d.]+/);
    price = priceMatch ? parseFloat(priceMatch[0]) : null;
  } else {
    price =
      first.price ||
      first.current_price ||
      first.price_value ||
      first.offer_price ||
      first.currentPrice;
    
    currency = first.currency || first.currency_code || 'USD';
  }

  // Extract URL - handle relative URLs
  let url = 
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

  // Convert relative URLs to absolute
  if (url && !url.startsWith('http')) {
    if (source === 'Walmart') {
      url = `https://www.walmart.com${url}`;
    } else if (source === 'Amazon') {
      url = `https://www.amazon.com${url}`;
    }
  }

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
    console.log(`🎭 Using mock data:`, useMock);
    
    if (!SB_KEY && !useMock) {
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
          walmartData = getMockData(name, 'Walmart');
          amazonData = getMockData(name, 'Amazon');
        } else {
          // Real API calls - Use structured extraction
          console.log('🔄 Using real API with structured extraction');
          [walmartData, amazonData] = await Promise.all([
            searchWalmartStructured(name, zipCode).catch(e => {
              console.error(`Walmart structured search error for ${name}:`, e);
              // Fallback to basic search if structured fails
              return searchWalmart(name, zipCode).catch(err => {
                console.error(`Walmart basic search also failed:`, err);
                return { error: err.message };
              });
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

// api/best-prices.js

export default async function handler(req, res) {
  console.log('best-prices hit', req.method, req.url);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    answer: 'Test OK from Vercel',
    prices: [],
  });
}

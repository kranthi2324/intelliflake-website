import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, imageBase64, mode } = req.body; 
    // mode can be: 'chat', 'identify', or 'calendar'

    // 1. (A) THE SYSTEM CONTEXT
    // We hardcode Zone 9b (Temecula) and inject the dynamic date.
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const systemPrompt = `
      You are GardenWise, an expert botanist specializing in **USDA Hardiness Zone 9b (Temecula, CA)**.
      Current Date: ${currentDate}.
      
      Guidelines:
      - Focus on drought-tolerant, water-wise gardening.
      - If the user asks for a schedule/plan, return specific months relevant to Southern California seasons.
      - If identifying a plant, check for signs of heat stress or pests common in this region.
    `;

    // 2. Configure Model
    // Use 'gemini-1.5-flash' for speed/cost, or 'gemini-1.5-pro' for complex reasoning
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // (B) Force JSON if requesting a calendar/schedule
      generationConfig: mode === 'calendar' ? { responseMimeType: "application/json" } : {}
    });

    // 3. Construct the Request
    const parts = [{ text: systemPrompt }];

    // Add user query
    if (mode === 'calendar') {
      parts.push({ text: `
        Based on the user's request, generate a seasonal maintenance calendar. 
        Return strictly a JSON array with this structure: 
        [{"month": "January", "task": "Prune roses", "priority": "High", "details": "..."}]
        
        User Request: ${message}
      `});
    } else {
      parts.push({ text: message });
    }

    // Add Image for "Snap & Solve"
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64, 
          mimeType: "image/jpeg",
        },
      });
    }

    // 4. Generate
    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    res.status(200).json({ 
      answer: responseText,
      // If mode was calendar, we might want to parse it on the client, 
      // but sending raw text (which is JSON string) is fine too.
    });

  } catch (error) {
    console.error("GardenWise Error:", error);
    res.status(500).json({ error: "Failed to generate gardening advice." });
  }
}

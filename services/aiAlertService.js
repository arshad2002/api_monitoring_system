const { GoogleGenAI } = require('@google/genai');

// Initialize the Google Gen AI SDK using the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateAIAlert(apiItem) {
  try {
    const prompt = `
    You are an AI SRE (Site Reliability Engineer) monitoring enterprise healthcare APIs. 
    Generate a concise, professional, human-readable alert message based on this incident:
    - API Name: ${apiItem.api_name}
    - Response Time: ${apiItem.response_time_ms} ms
    - Status Code: ${apiItem.status_code}
    - Records Returned: ${apiItem.records_returned}
    - Detected Issues: ${apiItem.anomaly_types.join(', ')}

    Keep the alert under 2 sentences, actionable, and clear. Example format: "AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error('LLM Generation Error:', error.message);
    // Fallback alert if AI generation fails temporarily
    return `${apiItem.api_name} encountered anomalies (Status: ${apiItem.status_code}, Time: ${apiItem.response_time_ms}ms).`;
  }
}

module.exports = { generateAIAlert };
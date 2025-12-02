import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Read both API keys from your project's environment secrets
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
// Define your CORS headers and allowed origins for security
const allowedOrigins = [
  'https://www.eco-lakbay.com',
  'https://eco-lakbay.com',
  'https://eco-lakbay-adventures-hub.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];
// --- HELPER FUNCTION: To make calls to the Gemini API ---
async function callGemini(contents, tools, systemPrompt) {
  if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY secret.");
  const body = {
    contents,
    tools
  };
  if (systemPrompt) {
    body.systemInstruction = {
      parts: [
        {
          text: systemPrompt
        }
      ]
    };
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorBody}`);
  }
  return response.json();
}
// --- HELPER FUNCTION: To get real location data from Google Geocoding API ---
async function geocodeLocation(locationQuery) {
  if (!googleMapsApiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY secret.");
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${googleMapsApiKey}&region=ph`;
  const response = await fetch(geocodeUrl);
  if (!response.ok) {
    console.error("Geocoding API failed for query:", locationQuery);
    return null;
  }
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    return {
      formattedAddress: data.results[0].formatted_address,
      location: data.results[0].geometry.location
    };
  }
  return null;
}
// --- MAIN SERVER LOGIC ---
serve(async (req)=>{
  const origin = req.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { message, history = [] } = await req.json();
    // The primary system prompt that defines the AI's persona and its tool usage rules.
    const systemPrompt = `
      ---
      ROLE & PERSONA:
      You are a specialized assistant for EcoLakbay, a sustainable tourism platform. Your ONLY purpose is to discuss and promote sustainable travel within the province of Pampanga, Philippines. You are friendly, positive, and an expert on Pampanga's eco-tourism.

      ---
      STRICT BOUNDARIES (MANDATORY RULES):
      1.  **SCOPE:** You MUST ONLY answer questions related to Pampanga, sustainable tourism, eco-friendly activities, and the EcoLakbay platform.
      2.  **REFUSAL:** If a user asks a question outside this scope (e.g., about other provinces, general knowledge, math, coding, etc.), you MUST politely refuse. A good refusal is: "I'm an expert on sustainable travel in Pampanga! I can't help with that, but I'd be happy to tell you about a beautiful eco-park or a local farm in the area." Do NOT apologize for your limitations.
      3.  **GEOGRAPHIC CONSTRAINT:** ALL of your recommendations for destinations, food, or activities MUST be located within Pampanga. If a user asks about a place outside Pampanga, gently redirect them back to a similar experience within Pampanga.

      ---
      TOOL USAGE RULE:
      When a user asks for a specific location, directions, or "where is" a place *within Pampanga*, you MUST use the "get_location_info" function to get the real, factual address. DO NOT invent addresses.
    `;
    // Prepare the conversation history for the AI
    const initialContents = [
      ...history.map((m)=>({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [
            {
              text: m.content
            }
          ]
        })),
      {
        role: 'user',
        parts: [
          {
            text: message
          }
        ]
      }
    ];
    // Define the "get_location_info" tool that Gemini can use
    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_location_info",
            description: "Get factual information, including the address and coordinates, for a specific place. Use this whenever a user asks about a location.",
            parameters: {
              type: "OBJECT",
              properties: {
                place_name: {
                  type: "STRING"
                }
              },
              required: [
                "place_name"
              ]
            }
          }
        ]
      }
    ];
    // STEP 1: First call to Gemini, providing the persona and the available tool.
    const initialGeminiResponse = await callGemini(initialContents, tools, systemPrompt);
    const candidate = initialGeminiResponse.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error("Gemini returned an invalid initial response.");
    }
    const firstPart = candidate.content.parts[0];
    let finalReply;
    // STEP 2: Check if Gemini decided to use our tool.
    if (firstPart.functionCall && firstPart.functionCall.name === 'get_location_info') {
      const placeName = firstPart.functionCall.args.place_name;
      // Execute the tool by calling the Google Geocoding API.
      const locationData = await geocodeLocation(placeName);
      // Prepare the tool's result to send back to Gemini.
      const functionResponsePart = {
        functionResponse: {
          name: "get_location_info",
          response: locationData ? {
            name: placeName,
            address: locationData.formattedAddress,
            lat: locationData.location.lat,
            lng: locationData.location.lng
          } : {
            name: placeName,
            error: "Location not found by the mapping service."
          }
        }
      };
      // Construct the conversation history for the second call
      const finalContents = [
        ...initialContents,
        candidate.content,
        {
          role: "tool",
          parts: [
            functionResponsePart
          ]
        }
      ];
      // A simpler prompt for the second call, telling the AI to summarize the factual data.
      const groundingPrompt = `You are a helpful assistant. A user asked about a location, and you have received factual data from a tool. Formulate a friendly, conversational response for the user based *only* on this data. Directly state the address you received from the tool.`;
      // STEP 3: Make the second call to Gemini, providing the facts and asking for a summary.
      const groundedGeminiResponse = await callGemini(finalContents, undefined, groundingPrompt);
      finalReply = groundedGeminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      // Manually add a Google Maps link if the location was found.
      if (locationData) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationData.location.lat},${locationData.location.lng}`;
        finalReply += `\n\n[View on Google Maps](${mapsUrl})`;
      }
    } else {
      // The AI answered directly, as no location tool was needed for the user's query.
      finalReply = firstPart.text;
    }
    if (!finalReply) {
      throw new Error("Failed to generate a final response from the AI.");
    }
    return new Response(JSON.stringify({
      reply: finalReply
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in chat function:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

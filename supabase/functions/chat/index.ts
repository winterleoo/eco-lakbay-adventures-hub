import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Read both API keys from the environment secrets
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const toGeminiContent = (message)=>({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [
      {
        text: message.content
      }
    ]
  });
serve(async (req)=>{
  // Your OPTIONS request handling is correct
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // --- Check for both API keys ---
    if (!geminiApiKey || !googleMapsApiKey) {
      throw new Error("Missing API keys. Ensure GEMINI_API_KEY and GOOGLE_MAPS_API_KEY are set.");
    }
    const { message, history = [] } = await req.json();
    // --- NEW, SMARTER SYSTEM PROMPT ---
    // We instruct the AI on how to request a map link.
    const systemPrompt = `You are a helpful and friendly assistant for EcoLakbay, a sustainable tourism platform for Pampanga, Philippines. When a user asks for directions, a location, or how to get to a specific place, you MUST include a special tag in your response like this: [MAP: Name of the Place, City]. For example: "You can find Clark Eco-Park here: [MAP: Clark Eco-Park, Angeles City]". Do not respond with a map URL yourself, just the tag. For all other questions, answer normally.`;
    const contents = history.map(toGeminiContent);
    contents.push({
      role: 'user',
      parts: [
        {
          text: message
        }
      ]
    });
    // --- 1. First, get the text response from Gemini ---
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        }
      })
    });
    if (!geminiResponse.ok) throw new Error(`Gemini API Error: ${await geminiResponse.text()}`);
    const geminiData = await geminiResponse.json();
    let replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error("Gemini returned an empty response.");
    // --- 2. Now, check if the response contains our special map tag ---
    const mapTagRegex = /\[MAP:\s*([^\]]+)\]/g;
    const matches = [
      ...replyText.matchAll(mapTagRegex)
    ];
    if (matches.length > 0) {
      // We found map tags! Let's process them.
      for (const match of matches){
        const fullTag = match[0]; // The full [MAP: ...] tag
        const locationQuery = match[1].trim(); // The text inside the tag
        // --- 3. Call the Google Geocoding API ---
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${googleMapsApiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        if (!geocodeResponse.ok) {
          console.error("Geocoding API failed for:", locationQuery);
          // If it fails, just remove the tag and continue
          replyText = replyText.replace(fullTag, '(Location details unavailable)');
          continue;
        }
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results && geocodeData.results.length > 0) {
          const { lat, lng } = geocodeData.results[0].geometry.location;
          // Create a standard Google Maps URL
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          // --- 4. Replace the tag with a clean, formatted Markdown link ---
          replyText = replyText.replace(fullTag, `[View on Google Maps](${googleMapsUrl})`);
        } else {
          // If location isn't found, replace the tag gracefully
          replyText = replyText.replace(fullTag, `(Could not find "${locationQuery}" on the map)`);
        }
      }
    }
    // --- 5. Send the final, enriched text to the frontend ---
    return new Response(JSON.stringify({
      reply: replyText
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

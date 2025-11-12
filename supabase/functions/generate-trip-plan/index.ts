import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
// A secure, specific list of allowed origins
const allowedOrigins = [
  'https://www.eco-lakbay.com',
  'https://eco-lakbay.com',
  'https://eco-lakbay-adventures-hub.vercel.app/',
  'http://localhost:3000',
  'http://localhost:5173'
];
serve(async (req)=>{
  // Dynamic CORS header generation
  const origin = req.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set in the function's environment variables.");
    }
    const { startingPoint, duration, interests, travelStyle, groupSize } = await req.json();
    const systemPrompt = `You are an expert travel planner for EcoLakbay, a platform focused on sustainable tourism in Pampanga, Philippines. Your goal is to generate a personalized, day-by-day travel itinerary based on the user's preferences.

    **Instructions:**
    1.  **Prioritize the Starting Point:** The entire itinerary MUST begin from, and logically flow around, the user's specified starting point. All travel times should consider this.
    2.  **Be Specific:** Mention real places, eco-lodges, local restaurants, and sustainable activities available in Pampanga.
    3.  **Promote Sustainability:** Weave in eco-friendly tips.
    4.  **Format with Markdown:** Use headings (e.g., "# Day 1: ..."), bold text, and bullet points.
    5.  **Be Friendly and Engaging:** Write in a welcoming and inspiring tone.`;
    const userPrompt = `
      Please create a sustainable travel plan for me in Pampanga, Philippines with the following preferences:
      
      - **My Starting Point/Accommodation:** ${startingPoint}
      - **Trip Duration:** ${duration}

      - **Group Size:** ${groupSize} person(s)
      - **My Travel Style:** ${travelStyle}
      - **My Interests:** ${interests.join(', ')}

      Please structure the response as a clear, day-by-day itinerary that is easy to follow.`;
<<<<<<< HEAD
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`, {
=======
<<<<<<< HEAD
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
=======
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-latest:generateContent?key=${geminiApiKey}`, {
>>>>>>> 5a85bc286849020af9fc8e47191c1e9eade8ff0a
>>>>>>> f2599fe073699cb4a06c73f9018b6951a0a9643a
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: userPrompt
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 8192
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
    }
    const data = await response.json();
    // --- THIS IS THE FIX ---
    // Safely access the first candidate using optional chaining.
    const candidate = data?.candidates?.[0];
    // Check if the candidate exists. If not, it was likely blocked by safety settings.
    if (!candidate) {
      // Log the full response for debugging purposes in your Supabase logs.
      console.error("Gemini response was blocked or empty. Full response:", JSON.stringify(data, null, 2));
      throw new Error("The request was blocked by the AI's safety filters. Please try rephrasing your interests.");
    }
    // Safely access the text content.
    const tripPlanPart = candidate?.content?.parts?.[0];
    const tripPlan = tripPlanPart?.text;
    // Check if the text content exists.
    if (!tripPlan) {
      console.error("Gemini response was valid but contained no text. Full candidate:", JSON.stringify(candidate, null, 2));
      throw new Error("The AI returned an empty plan. Please try again.");
    }
    // --- END OF FIX ---
    return new Response(JSON.stringify({
      tripPlan
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in trip planner function:', error.message);
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

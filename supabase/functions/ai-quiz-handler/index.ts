import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

const allowedOrigins = [
  "https://www.eco-lakbay.com",
  "https://eco-lakbay.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

const allowedTopics = [
  "Waste Management",
  "Carbon Footprint",
  "Responsible Tourism",
  "Eco-Friendly Travel",
  "Biodiversity Conservation",
  "Sustainable Destinations",
  "Community-Based Tourism",
  "Plastic Reduction",
  "Energy Conservation",
  "Cultural Heritage Preservation",
];

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { action, ...body } = await req.json();

    if (action === "generate") {
      const { topic } = body;
      if (!topic) throw new Error("Topic is required to generate a quiz.");

      // ✅ Validate topic to prevent random or irrelevant requests
      if (!allowedTopics.includes(topic)) {
        return new Response(
          JSON.stringify({
            error: "Invalid topic. Please choose a valid sustainability topic.",
            allowedTopics,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const systemPrompt = `
        You are a sustainability-focused AI that generates quizzes.
        Create a 10-question multiple-choice quiz about the topic: "${topic}".
        Each question must have exactly 4 options.
        Return only JSON in the format:
        {
          "questions": [
            {
              "questionText": string,
              "options": string[4],
              "correctAnswerIndex": number
            }
          ]
        }
      `;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate the quiz on "${topic}".` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error("Gemini API Error:", errText);
        throw new Error(`Gemini API returned an error: ${errText}`);
      }

      const geminiData = await geminiResponse.json();
      let quizData;

      try {
        quizData = JSON.parse(geminiData.candidates[0].content.parts[0].text);
      } catch (err) {
        console.error("Failed to parse Gemini response:", geminiData);
        throw new Error("Failed to parse quiz data from Gemini response.");
      }

      const { data: savedQuiz, error: dbError } = await supabase
        .from("quizzes")
        .insert({ topic, questions: quizData.questions })
        .select("id, questions")
        .single();

      if (dbError) throw dbError;

      const questionsForClient = savedQuiz.questions.map((q: QuizQuestion) => ({
        questionText: q.questionText,
        options: q.options,
      }));

      return new Response(
        JSON.stringify({ quizId: savedQuiz.id, questions: questionsForClient }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "grade") {
      const { quizId, userAnswers } = body;
      if (!quizId || !userAnswers)
        throw new Error("quizId and userAnswers are required.");

      const { data: quiz, error: fetchError } = await supabase
        .from("quizzes")
        .select("questions")
        .eq("id", quizId)
        .single();

      if (fetchError) throw fetchError;
      if (!quiz) throw new Error("Quiz not found.");

      let score = 0;
      const results = quiz.questions.map((q: QuizQuestion, i: number) => {
        const correct = q.correctAnswerIndex === userAnswers[i];
        if (correct) score++;
        return { isCorrect: correct, correctAnswerIndex: q.correctAnswerIndex };
      });

      return new Response(JSON.stringify({ score, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action.");
  } catch (error) {
    console.error("Error in quiz function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


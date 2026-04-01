import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userInput, framework } = await req.json();
    if (!userInput || typeof userInput !== "string") {
      return new Response(JSON.stringify({ error: "userInput is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const frameworkInstructions: Record<string, string> = {
      Standard: "Generate a clear, well-structured prompt with specific instructions.",
      Reasoning: "Generate a prompt that encourages step-by-step reasoning, analysis, and logical thinking.",
      RACE: "Use the RACE framework: Role (define who the AI should be), Action (what to do), Context (background info), Explanation (expected output format).",
      CARE: "Use the CARE framework: Context (situation), Action (what to do), Result (desired outcome), Example (provide an example).",
      APE: "Use the APE framework: Action (specific task), Purpose (why it matters), Execution (how to approach it step by step).",
    };

    const fw = framework || "Standard";
    const instruction = frameworkInstructions[fw] || frameworkInstructions.Standard;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI prompt generation expert. The user will describe what they need, and you will generate a highly effective, detailed prompt that they can use with any AI model.

Framework: ${fw}
${instruction}

Generate ONLY the prompt text. No explanations, no markdown formatting, no code blocks. Just the raw prompt ready to copy-paste.`,
          },
          { role: "user", content: userInput },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-prompt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

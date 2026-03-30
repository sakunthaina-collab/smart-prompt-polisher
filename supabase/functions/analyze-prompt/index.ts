import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are a prompt quality evaluator. Evaluate the prompt on clarity (1-10), specificity (1-10), and context (1-10). List top issues and improvement suggestions.

Return ONLY valid JSON with this exact structure:
{"scores":{"clarity":N,"specificity":N,"context":N},"issues":["..."],"improvements":["..."]}`,
          },
          {
            role: "user",
            content: `Evaluate this prompt:\n\n"${prompt}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_prompt",
              description: "Return prompt analysis scores and feedback",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "object",
                    properties: {
                      clarity: { type: "number", description: "Clarity score 1-10" },
                      specificity: { type: "number", description: "Specificity score 1-10" },
                      context: { type: "number", description: "Context score 1-10" },
                    },
                    required: ["clarity", "specificity", "context"],
                  },
                  issues: { type: "array", items: { type: "string" }, description: "Top issues found" },
                  improvements: { type: "array", items: { type: "string" }, description: "Improvement suggestions" },
                },
                required: ["scores", "issues", "improvements"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_prompt" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: parse from content
      const content = data.choices?.[0]?.message?.content || "{}";
      result = JSON.parse(content);
    }

    const scores = {
      clarity: Math.max(1, Math.min(10, result.scores?.clarity || 5)),
      specificity: Math.max(1, Math.min(10, result.scores?.specificity || 5)),
      context: Math.max(1, Math.min(10, result.scores?.context || 5)),
    };
    const overallScore = Math.round((scores.clarity + scores.specificity + scores.context) / 3);

    return new Response(JSON.stringify({
      scores,
      overallScore,
      issues: Array.isArray(result.issues) ? result.issues : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-prompt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

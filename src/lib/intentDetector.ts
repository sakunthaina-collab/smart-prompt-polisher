export interface IntentResult {
  intent: string;
  framework: "Standard" | "Reasoning" | "RACE" | "CARE" | "APE";
  outputFormat: string;
}

const rules: Record<string, IntentResult> = {
  email: { intent: "email", framework: "CARE", outputFormat: "paragraph" },
  code: { intent: "coding", framework: "Standard", outputFormat: "code" },
  program: { intent: "coding", framework: "Standard", outputFormat: "code" },
  documentation: { intent: "documentation", framework: "Standard", outputFormat: "step-by-step" },
  document: { intent: "documentation", framework: "Standard", outputFormat: "step-by-step" },
  analysis: { intent: "analysis", framework: "Reasoning", outputFormat: "bullet" },
  analyze: { intent: "analysis", framework: "Reasoning", outputFormat: "bullet" },
  marketing: { intent: "marketing", framework: "RACE", outputFormat: "paragraph" },
  writing: { intent: "writing", framework: "CARE", outputFormat: "paragraph" },
  write: { intent: "writing", framework: "CARE", outputFormat: "paragraph" },
  presentation: { intent: "presentation", framework: "APE", outputFormat: "bullet" },
  meeting: { intent: "meeting", framework: "APE", outputFormat: "bullet" },
  support: { intent: "support", framework: "CARE", outputFormat: "paragraph" },
  customer: { intent: "support", framework: "CARE", outputFormat: "paragraph" },
  content: { intent: "content", framework: "RACE", outputFormat: "paragraph" },
  blog: { intent: "content", framework: "RACE", outputFormat: "paragraph" },
};

export function detectIntent(userInput: string): IntentResult {
  const lower = userInput.toLowerCase();

  for (const [keyword, config] of Object.entries(rules)) {
    if (lower.includes(keyword)) {
      return config;
    }
  }

  return { intent: "general", framework: "Standard", outputFormat: "paragraph" };
}

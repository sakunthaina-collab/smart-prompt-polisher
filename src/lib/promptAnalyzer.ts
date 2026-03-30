export interface AnalysisResult {
  scores: {
    clarity: number;
    specificity: number;
    context: number;
  };
  overallScore: number;
  improvements: string[];
}

export function analyzePrompt(prompt: string): AnalysisResult {
  const words = prompt.trim().split(/\s+/);
  const wordCount = words.length;
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim());
  const hasQuestion = /\?/.test(prompt);
  const hasAction = /\b(create|write|generate|build|design|develop|make|draft|compose|prepare)\b/i.test(prompt);
  const hasAudience = /\b(for|audience|user|customer|reader|client|team|stakeholder)\b/i.test(prompt);
  const hasContext = /\b(because|context|background|situation|scenario|project|purpose|goal)\b/i.test(prompt);
  const hasFormat = /\b(format|structure|list|bullet|paragraph|step|table|json|markdown)\b/i.test(prompt);
  const hasTone = /\b(tone|style|formal|casual|professional|friendly|serious|humorous)\b/i.test(prompt);
  const hasConstraint = /\b(must|should|limit|maximum|minimum|avoid|don't|without|ensure|include)\b/i.test(prompt);

  // Clarity: sentence structure, action verbs, length
  let clarity = 3;
  if (hasAction) clarity += 2;
  if (sentences.length >= 2) clarity += 1;
  if (wordCount >= 10 && wordCount <= 100) clarity += 2;
  if (wordCount > 5) clarity += 1;
  if (hasQuestion) clarity += 1;
  clarity = Math.min(10, Math.max(1, clarity));

  // Specificity: details, constraints, format
  let specificity = 2;
  if (wordCount >= 15) specificity += 1;
  if (wordCount >= 30) specificity += 2;
  if (hasFormat) specificity += 2;
  if (hasConstraint) specificity += 2;
  if (hasTone) specificity += 1;
  if (hasAudience) specificity += 1;
  specificity = Math.min(10, Math.max(1, specificity));

  // Context
  let context = 2;
  if (hasContext) context += 3;
  if (hasAudience) context += 2;
  if (wordCount >= 20) context += 1;
  if (wordCount >= 40) context += 2;
  if (sentences.length >= 3) context += 1;
  context = Math.min(10, Math.max(1, context));

  const improvements: string[] = [];
  if (!hasAction) improvements.push("Add a clear action verb (e.g., 'Create', 'Write', 'Generate')");
  if (!hasAudience) improvements.push("Specify the target audience for better tailoring");
  if (!hasContext) improvements.push("Add more context about the purpose or background");
  if (!hasFormat) improvements.push("Specify the desired output format (list, paragraph, etc.)");
  if (!hasTone) improvements.push("Define the tone or style you want");
  if (!hasConstraint) improvements.push("Add constraints or requirements for more focused output");
  if (wordCount < 10) improvements.push("Your prompt is very short — add more detail");

  const overallScore = Math.round((clarity + specificity + context) / 3);

  return { scores: { clarity, specificity, context }, overallScore, improvements };
}

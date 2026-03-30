export function improvePrompt(prompt: string, framework: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return trimmed;

  const hasAction = /\b(create|write|generate|build|design|develop|make|draft|compose|prepare)\b/i.test(trimmed);
  const hasAudience = /\b(for|audience|user|customer|reader)\b/i.test(trimmed);
  const hasFormat = /\b(format|structure|list|bullet|paragraph|step)\b/i.test(trimmed);
  const hasTone = /\b(tone|style|formal|casual|professional|friendly)\b/i.test(trimmed);
  const hasContext = /\b(context|background|purpose|goal|because)\b/i.test(trimmed);

  let improved = trimmed;

  // Capitalize first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);

  // Ensure it ends with a period
  if (!/[.!?]$/.test(improved)) improved += ".";

  // Add action if missing
  if (!hasAction) {
    improved = "Please create the following: " + improved;
  }

  // Framework-specific enhancements
  switch (framework) {
    case "RACE":
      if (!hasAudience) improved += "\n\nRole: Act as an expert in this domain.";
      improved += "\nAction: Provide a comprehensive and well-structured response.";
      if (!hasContext) improved += "\nContext: Consider industry best practices and current trends.";
      improved += "\nExplanation: Include reasoning for each key point.";
      break;
    case "CARE":
      if (!hasContext) improved += "\n\nContext: Consider the broader context and implications.";
      improved += "\nAction: Deliver actionable and practical output.";
      improved += "\nResult: Ensure the output is complete and ready to use.";
      improved += "\nExample: Include at least one concrete example.";
      break;
    case "APE":
      improved += "\n\nAction: Execute with precision and attention to detail.";
      improved += "\nPurpose: The goal is to produce high-quality, professional output.";
      improved += "\nExecution: Follow a systematic step-by-step approach.";
      break;
    case "Reasoning":
      improved += "\n\nPlease think through this step-by-step:";
      improved += "\n1. First, analyze the core requirements";
      improved += "\n2. Consider different approaches and trade-offs";
      improved += "\n3. Provide a well-reasoned, comprehensive response";
      break;
    default:
      if (!hasAudience) improved += "\n\nTarget audience: General professional audience.";
      if (!hasFormat) improved += "\nOutput format: Well-structured with clear sections.";
      if (!hasTone) improved += "\nTone: Professional and clear.";
      break;
  }

  if (!hasFormat) improved += "\n\nPlease format the response clearly with appropriate headings and structure.";

  return improved;
}

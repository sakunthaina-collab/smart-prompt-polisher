export interface PromptScore {
  clarity: number;
  specificity: number;
  effectiveness: number;
  total: number;
}

export function scorePrompt(prompt: string): PromptScore {
  if (!prompt.trim()) return { clarity: 0, specificity: 0, effectiveness: 0, total: 0 };

  const words = prompt.trim().split(/\s+/);
  const wordCount = words.length;
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim());
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));

  const hasAction = /\b(create|write|generate|build|design|develop|make|draft|compose|prepare|explain|describe|analyze|summarize|list|compare|evaluate|review|outline|plan)\b/i.test(prompt);
  const hasAudience = /\b(for|audience|user|customer|reader|client|team|stakeholder|developer|manager|student|beginner|expert)\b/i.test(prompt);
  const hasContext = /\b(because|context|background|situation|scenario|project|purpose|goal|about|regarding|related|based on)\b/i.test(prompt);
  const hasFormat = /\b(format|structure|list|bullet|paragraph|step|table|json|markdown|section|heading|numbered|outline)\b/i.test(prompt);
  const hasTone = /\b(tone|style|formal|casual|professional|friendly|serious|humorous|concise|detailed|brief|comprehensive)\b/i.test(prompt);
  const hasConstraint = /\b(must|should|limit|maximum|minimum|avoid|don't|without|ensure|include|exclude|no more than|at least|exactly)\b/i.test(prompt);
  const hasExample = /\b(example|such as|like|e\.g\.|for instance|sample)\b/i.test(prompt);
  const hasSpecificNumber = /\b\d+\b/.test(prompt);

  // Clarity (0-100): How clear and understandable the prompt is
  let clarity = 20;
  if (hasAction) clarity += 20;
  if (sentences.length >= 1) clarity += 10;
  if (sentences.length >= 2) clarity += 10;
  if (wordCount >= 5) clarity += 10;
  if (wordCount >= 10 && wordCount <= 150) clarity += 15;
  if (wordCount > 150) clarity -= 10; // too verbose reduces clarity
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : wordCount;
  if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 25) clarity += 15;
  clarity = Math.min(100, Math.max(0, clarity));

  // Specificity (0-100): How specific and detailed the prompt is
  let specificity = 10;
  if (wordCount >= 10) specificity += 10;
  if (wordCount >= 20) specificity += 10;
  if (wordCount >= 40) specificity += 10;
  if (hasFormat) specificity += 15;
  if (hasConstraint) specificity += 15;
  if (hasTone) specificity += 10;
  if (hasAudience) specificity += 10;
  if (hasExample) specificity += 10;
  if (hasSpecificNumber) specificity += 10;
  specificity = Math.min(100, Math.max(0, specificity));

  // Effectiveness (0-100): How likely it is to produce good results
  let effectiveness = 15;
  if (hasAction) effectiveness += 15;
  if (hasContext) effectiveness += 15;
  if (hasAudience) effectiveness += 10;
  if (hasFormat) effectiveness += 10;
  if (hasConstraint) effectiveness += 10;
  if (wordCount >= 15) effectiveness += 10;
  if (sentences.length >= 2) effectiveness += 5;
  const vocabularyRichness = uniqueWords.size / Math.max(1, wordCount);
  if (vocabularyRichness > 0.6) effectiveness += 10;
  effectiveness = Math.min(100, Math.max(0, effectiveness));

  const total = Math.round((clarity + specificity + effectiveness) / 3);

  return { clarity, specificity, effectiveness, total };
}

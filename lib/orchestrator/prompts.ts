export function buildSystemPrompt(engineName: string, base: string) {
  return `You are playing ${engineName}. Respond ONLY with JSON matching the provided schema. ${base}`.trim();
}



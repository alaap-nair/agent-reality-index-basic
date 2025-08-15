import { LLMModel } from '@/lib/types';

export function anthropicModel(model = 'claude-3-haiku'): LLMModel {
  return {
    name: `anthropic:${model}`,
    async invoke() {
      const raw = JSON.stringify({ guess: Math.floor(Math.random() * 10) });
      const latencyMs = 600;
      return { raw, latencyMs, validJSON: true };
    },
  };
}



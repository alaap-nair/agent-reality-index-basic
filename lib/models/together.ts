import { LLMModel } from '@/lib/types';

export function togetherModel(model = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'): LLMModel {
  return {
    name: `together:${model}`,
    async invoke() {
      const raw = JSON.stringify({ guess: Math.floor(Math.random() * 10) });
      const latencyMs = 700;
      return { raw, latencyMs, validJSON: true };
    },
  };
}



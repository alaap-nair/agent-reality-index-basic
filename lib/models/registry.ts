import { ModelAdapter } from './base';
import { FalAdapter } from './fal';
import { SimulatedAdapter } from './simulated';

export function getAdapter(modelName: string): ModelAdapter {
  if (modelName.startsWith('fal:')) {
    // Support fal:any-llm:<SUBMODEL>
    // Anything after 'fal:' is treated as modelId and parsed in the adapter
    const modelId = modelName.slice('fal:'.length);
    // If the modelId includes a route hint like 'any-llm:submodel', route is always any-llm
    const hasAnyLlm = modelId.startsWith('any-llm:') || modelId === 'any-llm';
    const path = hasAnyLlm ? '/fal-ai/any-llm' : undefined;
    return new FalAdapter({ modelId, path });
  }
  if (modelName === 'simulated') return new SimulatedAdapter();
  throw new Error(`Unknown model adapter: ${modelName}`);
}

// rough pricing map (USD per 1k tokens). Fallback if endpoint doesn’t return usage.
export const PRICE_MAP: Record<string, { in: number; out: number }> = {
  // Fallbacks
  'fal:default': { in: 0.5, out: 1.5 },
  simulated: { in: 0, out: 0 },
  // Per-submodel overrides (USD per 1k tokens, rough)
  'fal:any-llm:openai/gpt-4o-mini': { in: 0.150, out: 0.600 },
  'fal:any-llm:meta-llama/llama-3.1-70b-instruct': { in: 0.060, out: 0.240 },
  'fal:any-llm:qwen/qwen2.5-32b-instruct': { in: 0.030, out: 0.120 },
};



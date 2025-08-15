import { describe, it, expect } from 'vitest';
import { GameEngine, MatchResult } from '@/lib/types';
import { ModelAdapter, ModelRequest, ModelResponse } from '@/lib/models/base';
import { playMatch } from '@/lib/orchestrator/runner';

type S = { turns: number };
type A = { move: string };

const engine: GameEngine<S, A> = {
  name: 'illegal',
  systemPrompt: 'Respond {"move":"X"}',
  schema: { type: 'object', properties: { move: { type: 'string' } }, required: ['move'], additionalProperties: false },
  maxTokens: 8,
  timeoutMs: 2000,
  init() { return { turns: 0 }; },
  isOver(s) { return s.turns >= 3; },
  buildPrompt(s) { return `turn ${s.turns}`; },
  applyAction(s) { return { state: { turns: s.turns + 1 } }; },
  score(s): MatchResult { return { game: 'illegal', model: 'x', seed: 0, startedAt: '', finishedAt: '', success: false, score: 0, turns: [] }; },
};

// Adapter will produce invalid JSON first, then invalid again on repair
const badAdapter: ModelAdapter = {
  name: 'simulated',
  async complete(req: ModelRequest): Promise<ModelResponse> {
    if (req.user.includes('Previous response')) {
      return { rawText: 'still not json', latencyMs: 5 };
    }
    return { rawText: 'not json', latencyMs: 5 };
  },
};

describe('runner illegal move', () => {
  it('ends the game when schema validation fails twice', async () => {
    const res = await playMatch(engine, badAdapter, 1, badAdapter.name);
    expect(res.success).toBe(false);
    expect(res.turns.length).toBe(1);
  });
});



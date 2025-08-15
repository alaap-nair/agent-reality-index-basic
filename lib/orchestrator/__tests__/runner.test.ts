import { describe, it, expect } from 'vitest';
import { GameEngine, MatchResult } from '@/lib/types';
import { ModelAdapter, ModelRequest, ModelResponse } from '@/lib/models/base';
import { playMatch } from '@/lib/orchestrator/runner';

type S = { target: number; done: boolean; guesses: number[] };
type A = { guess: number };

const mockEngine: GameEngine<S, A> = {
  name: 'mock',
  systemPrompt: 'Guess a number 0-9. Respond {"guess":N}',
  schema: { type: 'object', properties: { guess: { type: 'integer', minimum: 0, maximum: 9 } }, required: ['guess'], additionalProperties: false },
  maxTokens: 8,
  timeoutMs: 2000,
  init(seed: number): S { return { target: seed % 10, done: false, guesses: [] }; },
  isOver(s: S): boolean { return s.done || s.guesses.length >= 5; },
  buildPrompt(s: S): string { return `Turn ${s.guesses.length}. Previous: ${s.guesses.join(', ')}`; },
  applyAction(s: S, a: A) { const hit = a.guess === s.target; return { state: { ...s, done: hit, guesses: [...s.guesses, a.guess] } }; },
  score(s: S): MatchResult { return { game: 'mock', model: 'x', seed: 0, startedAt: '', finishedAt: '', success: s.done, score: s.done ? 1 : 0, turns: [] }; },
};

const simulated: ModelAdapter = {
  name: 'simulated',
  async complete(req: ModelRequest): Promise<ModelResponse> {
    const m = req.user.match(/(\d+)/);
    const next = m ? (parseInt(m[1]!, 10) + 1) % 10 : 0;
    return { rawText: JSON.stringify({ guess: next }), latencyMs: 10 };
  },
};

describe('playMatch', () => {
  it('runs to completion and returns a MatchResult', async () => {
    const res = await playMatch(mockEngine, simulated, 1, simulated.name);
    expect(res.game).toBe('mock');
    expect(res.model).toBe('simulated');
    expect(res.turns.length).toBeGreaterThan(0);
  });
});



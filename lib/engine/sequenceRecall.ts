import { GameEngine, MatchResult } from '@/lib/types';

type State = { sequence: number[]; replies: number[]; idx: number; max: number };
type Action = { value: number };

export const sequenceRecallEngine: GameEngine<State, Action> = {
  name: 'sequenceRecall',
  systemPrompt: 'Repeat the next number in the sequence. Respond as {"value":N}.',
  schema: { type: 'object', properties: { value: { type: 'integer' } }, required: ['value'], additionalProperties: false },
  maxTokens: 12,
  timeoutMs: 5000,
  init(seed: number) {
    const base = [1, 1, 2, 3, 5, 8, 13, 21];
    const sequence = base.map((n, i) => n + (seed % 3 === 0 && i > 4 ? 1 : 0));
    return { sequence, replies: [], idx: 0, max: sequence.length };
  },
  isOver(s) {
    return s.idx >= s.max;
  },
  buildPrompt(s) {
    return `Sequence so far: ${s.sequence.slice(0, s.idx).join(', ')}. Next?`;
  },
  applyAction(s, a) {
    const next = { ...s, replies: [...s.replies, a.value], idx: s.idx + 1 };
    return { state: next };
  },
  score(s): MatchResult {
    const correct = s.replies.filter((v, i) => v === s.sequence[i]).length;
    const score = s.max === 0 ? 0 : correct / s.max;
    return { game: 'sequenceRecall', model: 'unknown', seed: 0, startedAt: '', finishedAt: '', success: score > 0.5, score, turns: [] };
  },
};



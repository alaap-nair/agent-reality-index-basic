import { describe, it, expect } from 'vitest';
import { deductionEngine } from '@/lib/engine/deduction';

describe('deductionEngine', () => {
  it('puzzles are uniquely solvable and score correctly', () => {
    for (let seed = 0; seed < 3; seed += 1) {
      const state = deductionEngine.init(seed);
      // Uniqueness check happens in init; if not unique it would throw
      expect(state.secret).toBeDefined();
      const s2 = deductionEngine.applyAction(state, state.secret).state;
      const res = deductionEngine.score(s2);
      expect(res.score).toBe(100);
      expect(res.success).toBe(true);
    }
  });
  it('violated clues are reported on incorrect answer', () => {
    const state = deductionEngine.init(0);
    const wrong = { color: 'blue', shape: 'square' } as any;
    const res = deductionEngine.score({ ...state, attempts: [wrong] } as any);
    expect(res.success).toBe(false);
    expect(Array.isArray((res.meta as any)?.violatedClues)).toBe(true);
  });
});



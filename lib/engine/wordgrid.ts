import { GameEngine, MatchResult } from '@/lib/types';
import wordlist from './wordlist_small.json';

type State = {
  phase: 'hunt';
  grid: string[]; // length 16, lowercase letters
  turnsLeft: number; // start at 20
  found: Set<string>;
  score: number;
  invalidCount: number;
};

type Action = { word: string; path: number[] };

const WORD_SET: Set<string> = new Set(
  (Array.isArray(wordlist) ? (wordlist as unknown as string[]) : []).map((w) => w.toLowerCase())
);

function lcg(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function buildGrid(seed: number): string[] {
  const rnd = lcg(seed);
  const letters = 'eeeeeeeeeeeeeeeeetaoinshrdlcumwfgypbvkjxqz'; // lightweight frequency bias
  const grid: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const idx = Math.floor(rnd() * letters.length);
    grid.push(letters[idx]);
  }
  return grid;
}

function idxToRC(index: number): { r: number; c: number } {
  return { r: Math.floor(index / 4), c: index % 4 };
}

function isAdjacent8(a: number, b: number): boolean {
  const A = idxToRC(a);
  const B = idxToRC(b);
  const dr = Math.abs(A.r - B.r);
  const dc = Math.abs(A.c - B.c);
  return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
}

export const wordgridEngine: GameEngine<State, Action> = {
  name: 'wordgrid',
  systemPrompt:
    'You are playing WordHunt/Boggle on a 4x4 grid. Return ONLY valid JSON for the schema. No extra text.',
  schema: {
    type: 'object',
    properties: {
      word: { type: 'string' },
      path: { type: 'array', items: { type: 'integer' }, minItems: 2 },
    },
    required: ['word', 'path'],
    additionalProperties: false,
  },
  maxTokens: 24,
  timeoutMs: 6000,
  init(seed: number): State {
    return {
      phase: 'hunt',
      grid: buildGrid(seed),
      turnsLeft: 20,
      found: new Set<string>(),
      score: 0,
      invalidCount: 0,
    };
  },
  isOver(s) {
    return s.turnsLeft <= 0;
  },
  buildPrompt(s) {
    const rows = [
      s.grid.slice(0, 4).join(' '),
      s.grid.slice(4, 8).join(' '),
      s.grid.slice(8, 12).join(' '),
      s.grid.slice(12, 16).join(' '),
    ].join('\n');
    return [
      '4x4 Grid (rows):',
      rows,
      '',
      'Rules:',
      '- Form a valid English word from adjacent letters (8-direction adjacency).',
      '- Use each cell at most once per word.',
      '- Provide exactly one word per turn.',
      '- Path indices are 0..15 corresponding to the 4x4 grid flattened row-wise.',
      `- Remaining turns: ${s.turnsLeft}`,
      '',
      'Respond with JSON ONLY, matching this schema: {"word":string,"path":number[]}',
    ].join('\n');
  },
  applyAction(s, a) {
    const word = (a?.word ?? '').toLowerCase();
    const path = Array.isArray(a?.path) ? a.path : [];

    let invalid = false;
    // Basic checks
    if (!word || path.length !== word.length) invalid = true;
    if (!invalid && path.length < 2) invalid = true;
    const used = new Set<number>();
    for (let i = 0; !invalid && i < path.length; i += 1) {
      const idx = path[i];
      if (!Number.isInteger(idx) || idx < 0 || idx > 15) { invalid = true; break; }
      if (used.has(idx)) { invalid = true; break; }
      if (i > 0 && !isAdjacent8(path[i - 1], idx)) { invalid = true; break; }
      used.add(idx);
      const ch = s.grid[idx];
      if (word[i] !== ch) { invalid = true; break; }
    }
    if (!invalid && !WORD_SET.has(word)) invalid = true;
    if (!invalid && s.found.has(word)) invalid = true;

    if (invalid) {
      const next: State = { ...s, turnsLeft: 0, invalidCount: s.invalidCount + 1 };
      return { state: next };
    }

    // Valid move
    const next: State = {
      ...s,
      phase: 'hunt',
      turnsLeft: s.turnsLeft - 1,
      found: new Set<string>(s.found),
      score: s.score + word.length,
      invalidCount: s.invalidCount,
    };
    next.found.add(word);
    return { state: next };
  },
  score(s): MatchResult {
    return {
      game: 'wordgrid',
      model: 'unknown',
      seed: 0,
      startedAt: '',
      finishedAt: '',
      success: true,
      score: s.score,
      turns: [],
      meta: { uniqueWords: s.found.size, invalidCount: s.invalidCount },
    };
  },
};
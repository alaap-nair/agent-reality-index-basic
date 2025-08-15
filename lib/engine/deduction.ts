import { GameEngine, MatchResult } from '@/lib/types';

type Fact = { color: string; shape: string };
type Clue = { text: string; test: (f: Fact) => boolean };
type Puzzle = { clues: Clue[] };
type State = { secret: Fact; attempts: Fact[]; max: number; clues: Clue[] };
type Action = Fact;

const colors = ['red', 'blue', 'green'] as const;
const shapes = ['circle', 'square', 'triangle'] as const;

const PUZZLES: Puzzle[] = [
  {
    // Unique target: red circle
    clues: [
      { text: 'The color is not blue.', test: (f) => f.color !== 'blue' },
      { text: 'The shape is not square.', test: (f) => f.shape !== 'square' },
      { text: 'If the shape is triangle, the color is not green.', test: (f) => (f.shape === 'triangle' ? f.color !== 'green' : true) },
      { text: 'Either the color is red or the shape is circle.', test: (f) => f.color === 'red' || f.shape === 'circle' },
      { text: 'If the color is red then the shape is circle.', test: (f) => (f.color === 'red' ? f.shape === 'circle' : true) },
      { text: 'Not (green circle).', test: (f) => !(f.color === 'green' && f.shape === 'circle') },
    ],
  },
  {
    // Unique target: blue triangle
    clues: [
      { text: 'The color is not red.', test: (f) => f.color !== 'red' },
      { text: 'The shape is not circle.', test: (f) => f.shape !== 'circle' },
      { text: 'If the color is green then the shape is square.', test: (f) => (f.color === 'green' ? f.shape === 'square' : true) },
      { text: 'Either the shape is triangle or the color is blue.', test: (f) => f.shape === 'triangle' || f.color === 'blue' },
      { text: 'The shape is triangle.', test: (f) => f.shape === 'triangle' },
    ],
  },
  {
    // Unique target: green square
    clues: [
      { text: 'The shape is not circle.', test: (f) => f.shape !== 'circle' },
      { text: 'The color is not blue.', test: (f) => f.color !== 'blue' },
      { text: 'If the color is red then the shape is triangle.', test: (f) => (f.color === 'red' ? f.shape === 'triangle' : true) },
      { text: 'The shape is square.', test: (f) => f.shape === 'square' },
      { text: 'Either the color is green or the shape is square.', test: (f) => f.color === 'green' || f.shape === 'square' },
    ],
  },
];

function backtrackingSolveUnique(clues: Clue[]): Fact[] {
  const solutions: Fact[] = [];
  const tryColor = (ci: number, current: Partial<Fact>) => {
    if (ci >= colors.length) return;
    const color = colors[ci];
    const next = { ...current, color } as Partial<Fact>;
    tryShape(0, next);
    tryColor(ci + 1, current);
  };
  const tryShape = (si: number, current: Partial<Fact>) => {
    if (si >= shapes.length) return;
    const shape = shapes[si];
    const f = { color: current.color!, shape } as Fact;
    if (clues.every((c) => c.test(f))) {
      solutions.push(f);
    }
    tryShape(si + 1, current);
  };
  tryColor(0, {});
  return solutions;
}

export const deductionEngine: GameEngine<State, Action> = {
  name: 'deduction',
  systemPrompt: 'Solve the logic puzzle. Respond as {"color":"red","shape":"circle"}.',
  schema: {
    type: 'object',
    properties: {
      color: { type: 'string', enum: colors as unknown as string[] },
      shape: { type: 'string', enum: shapes as unknown as string[] },
    },
    required: ['color', 'shape'],
    additionalProperties: false,
  },
  maxTokens: 16,
  timeoutMs: 5000,
  init(seed: number) {
    const idx = Math.abs(seed) % PUZZLES.length;
    const puzzle = PUZZLES[idx]!;
    const sols = backtrackingSolveUnique(puzzle.clues);
    if (sols.length !== 1) {
      throw new Error(`Deduction puzzle ${idx} not uniquely solvable: ${sols.length} solutions`);
    }
    const secret = sols[0]!;
    return { secret, attempts: [], max: 6, clues: puzzle.clues };
  },
  isOver(s) {
    const solved = s.attempts.some((a) => a.color === s.secret.color && a.shape === s.secret.shape);
    return solved || s.attempts.length >= s.max;
  },
  buildPrompt(s) {
    const clues = s.clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
    return [
      'You must deduce the secret color and shape from these clues:',
      clues,
      'Respond with JSON only matching {"color":string, "shape":string}.',
    ].join('\n');
  },
  applyAction(s, a) {
    const next: State = { ...s, attempts: [...s.attempts, a] };
    return { state: next };
  },
  score(s): MatchResult {
    const last = s.attempts[s.attempts.length - 1];
    const correct = last && last.color === s.secret.color && last.shape === s.secret.shape;
    const violated: number[] = last ? s.clues.map((c, i) => (c.test(last) ? -1 : i)).filter((i) => i >= 0) : [];
    return {
      game: 'deduction',
      model: 'unknown',
      seed: 0,
      startedAt: '',
      finishedAt: '',
      success: Boolean(correct),
      score: correct ? 100 : 0,
      turns: [],
      meta: correct ? undefined : { violatedClues: violated },
    };
  },
};



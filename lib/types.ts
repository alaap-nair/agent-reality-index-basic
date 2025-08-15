export type TurnLog = {
  prompt: string;
  raw: string;
  parsed?: unknown;
  validJSON: boolean;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  error?: string;
};

export type MatchResult = {
  game: string;
  model: string;
  seed: number;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  score: number;
  meta?: Record<string, unknown>;
  turns: TurnLog[];
  costUSD?: number;
};

export interface GameEngine<S, A> {
  name: string;
  systemPrompt: string;
  schema: object; // JSON schema for one action (or final answer)
  maxTokens: number;
  timeoutMs: number;
  init(seed: number): S; // deterministic start
  isOver(s: S): boolean;
  buildPrompt(s: S): string; // serialize visible state for the model
  applyAction(s: S, a: A): { state: S; turnMeta?: unknown }; // advance game
  score(s: S): MatchResult; // finalize + score
}

export type ModelInvocation = {
  raw: string;
  parsed?: unknown;
  tokensIn?: number;
  tokensOut?: number;
  costUSD?: number;
  latencyMs: number;
  validJSON: boolean;
  error?: string;
};

export interface LLMModel {
  name: string;
  invoke: (args: {
    systemPrompt: string;
    userPrompt: string;
    schema?: object;
    maxTokens?: number;
    timeoutMs?: number;
    seed?: number;
  }) => Promise<ModelInvocation>;
}



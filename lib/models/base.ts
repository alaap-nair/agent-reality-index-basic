export type ModelRequest = {
  system: string;
  user: string;
  jsonSchema?: object;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type ModelResponse = {
  rawText: string;
  parsed?: unknown;
  tokensIn?: number;
  tokensOut?: number;
  ttftMs?: number;
  latencyMs: number;
};

export interface ModelAdapter {
  name: string;
  complete(req: ModelRequest): Promise<ModelResponse>;
}




import OpenAI from 'openai';
import { ModelAdapter, ModelRequest, ModelResponse } from '@/lib/models/base';
import { safeJSONParse } from '@/lib/models/utils';

export class OpenAIAdapter implements ModelAdapter {
  public readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(model: string = 'gpt-4.1') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('Missing OPENAI_API_KEY');
    this.client = new OpenAI({ apiKey: key });
    this.model = model;
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const t0 = Date.now();
    const needsJson = Boolean(req.jsonSchema);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: req.system },
      { role: 'user', content: needsJson ? `${req.user}\n\nReturn ONLY valid JSON matching this schema:\n${JSON.stringify(req.jsonSchema)}` : req.user },
    ];
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      response_format: needsJson ? { type: 'json_object' } : undefined,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.2,
    });
    const latencyMs = Date.now() - t0;
    const choice = completion.choices?.[0];
    const content = (choice?.message as { content?: string })?.content ?? '';
    return {
      rawText: content,
      parsed: safeJSONParse(content),
      tokensIn: completion.usage?.prompt_tokens ?? undefined,
      tokensOut: completion.usage?.completion_tokens ?? undefined,
      latencyMs,
    };
  }
}




// lib/models/fal.ts
import { ModelAdapter, ModelRequest, ModelResponse } from "./base";
import { safeJSONParse } from "./utils";
import { getFalConfigFromEnv } from './env';

export class FalAdapter implements ModelAdapter {
  name = "fal";
  private baseUrl: string;
  private path: string;
  private apiKey: string;
  private modelId: string; // e.g., "any-llm" or "any-llm:llama-3.1-70b-instruct"

  constructor(opts?: { baseUrl?: string; path?: string; apiKey?: string; modelId?: string }) {
    const env = getFalConfigFromEnv();
    this.baseUrl = opts?.baseUrl ?? env.baseUrl;
    this.path    = opts?.path    ?? env.path; // default: "/fal-ai/any-llm"
    this.apiKey  = opts?.apiKey  ?? env.apiKey;
    this.modelId = opts?.modelId ?? env.modelId; // default: gpt-4o-mini
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 15000);
    const t0 = Date.now();

    // allow "any-llm:SUBMODEL" to select the underlying LLM
    const parts = this.modelId.split(":");
    // example: any-llm:gpt-4o-mini -> parts = ["any-llm","gpt-4o-mini"]
    const underlying = parts.length > 1 ? parts.slice(1).join(":") : this.modelId;

    const systemPrompt = req.system ?? '';
    const prompt = buildUserContent(req);

    // any-llm expects a flat body (no input wrapper)
    const body: Record<string, unknown> = {
      model: underlying.includes('/') ? underlying : `openai/${underlying}`,
      prompt,
      // Always include both prompt and messages for maximum compatibility
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    };
    if (systemPrompt) body.system_prompt = systemPrompt;

    // IMPORTANT: any-llm endpoint is typically just /fal-ai/any-llm (no /completions)
    const url = `${this.baseUrl.replace(/\/+$/,'')}/${this.path.replace(/^\/+/, '')}`;
    if (process.env.DEBUG_FAL === '1') {
      const maskedKey = this.apiKey.length > 4 ? this.apiKey.slice(0,2) + '***' + this.apiKey.slice(-2) : '****';
      // eslint-disable-next-line no-console
      console.log('[FAL DEBUG] url=', url, 'auth=', `Key ${maskedKey}`, 'body-preview=', JSON.stringify({ ...body, messages: '[omitted]' }));
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Key ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error('[FAL ERROR]', res.status, res.statusText, text);
      throw new Error(`FAL HTTP ${res.status}: ${text}`);
    }

    // Helper to produce a masked, compact preview string
    const maskPreview = (value: string): string => {
      const compact = value.replace(/\s+/g, ' ').trim();
      const slice = compact.slice(0, 100);
      const maskedKey = this.apiKey && this.apiKey.length > 4 ? this.apiKey.slice(0, 2) + '***' + this.apiKey.slice(-2) : '****';
      return (this.apiKey ? slice.split(this.apiKey).join(maskedKey) : slice) + (compact.length > 100 ? '…' : '');
    };

    // Read as text first so we can include a preview if JSON parsing fails
    const initialText = await res.text();
    let initial: any;
    try {
      initial = initialText ? JSON.parse(initialText) : {};
    } catch (e) {
      throw new Error(`FAL invalid JSON (initial): ${maskPreview(initialText)}`);
    }

    // Queue flow: if response_url/status_url provided, poll and fetch final result
    if (initial && initial.response_url && initial.status_url) {
      const { response_url, status_url } = initial as { response_url: string; status_url: string };
      const deadline = Date.now() + (req.timeoutMs ?? 15000);
      let lastStatus: any = initial;
      while (Date.now() < deadline) {
        try {
          const s = await fetch(status_url, { headers: { Authorization: `Key ${this.apiKey}` } });
          const stText = await s.text().catch(() => '');
          try {
            lastStatus = stText ? JSON.parse(stText) : lastStatus;
          } catch {
            // keep lastStatus on parse error
          }
          const st = (lastStatus?.status || '').toUpperCase();
          if (st && st !== 'IN_QUEUE' && st !== 'IN_PROGRESS' && st !== 'PENDING') break;
        } catch {}
        await new Promise((r) => setTimeout(r, 400));
      }
      const finalRes = await fetch(response_url, { headers: { Authorization: `Key ${this.apiKey}` } });
      const finalText = await finalRes.text();
      let finalData: any = {};
      try {
        finalData = finalText ? JSON.parse(finalText) : {};
      } catch {
        throw new Error(`FAL invalid JSON (final): ${maskPreview(finalText)}`);
      }

      if (process.env.DEBUG_FAL === '1') {
        // eslint-disable-next-line no-console
        console.log('[FAL DEBUG] finalData=', finalData);
      }

      const rawText = extractRawText(finalData);
      const latencyMs = Date.now() - t0;
      return {
        rawText,
        parsed: safeJSONParse(rawText),
        tokensIn: finalData?.usage?.prompt_tokens,
        tokensOut: finalData?.usage?.completion_tokens,
        latencyMs,
      };
    }

    // Synchronous response
    const data = initial;
    const rawText = extractRawText(data);
    const latencyMs = Date.now() - t0;
    return { rawText, parsed: safeJSONParse(rawText), tokensIn: data?.usage?.prompt_tokens, tokensOut: data?.usage?.completion_tokens, latencyMs };
  }
}

function extractRawText(data: any): string {
  const textCandidate =
    data?.output?.text ??
    data?.output?.message ??
    data?.output?.content ??
    data?.choices?.[0]?.message?.content ??
    data?.text ??
    data?.response ??
    (typeof data?.output === 'string' ? (data.output as string) : undefined);

  if (typeof textCandidate === 'string' && textCandidate.length > 0) return textCandidate;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function buildUserContent(req: ModelRequest): string {
  const schemaHint = req.jsonSchema
    ? `\nReturn ONLY valid JSON matching this JSON Schema (no extra text):\n${JSON.stringify(req.jsonSchema)}`
    : "";
  return `${req.user ?? ""}${schemaHint}`;
}

export default FalAdapter;

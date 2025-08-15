import { GameEngine, MatchResult, TurnLog } from '@/lib/types';
import { forceJSON, validateAgainstSchema } from './validators';
import { ModelAdapter } from '@/lib/models/base';
import { appendRunLine, appendTurnLine } from '@/lib/storage';
import { PRICE_MAP } from '@/lib/models/registry';

export async function playMatch<S, A>(
  engine: GameEngine<S, A>,
  adapter: ModelAdapter,
  seed: number,
  modelName: string,
  priceUsdPer1kTokensIn = 0,
  priceUsdPer1kTokensOut = 0
): Promise<MatchResult> {
  const startedAt = new Date().toISOString();
  let state = engine.init(seed);
  const turns: TurnLog[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCost = 0;

  let turnIndex = 0;
  const price = PRICE_MAP[modelName] ?? { in: 0, out: 0 };
  while (!engine.isOver(state)) {
    const userPrompt = engine.buildPrompt(state);
    const req = {
      system: engine.systemPrompt,
      user: userPrompt,
      jsonSchema: engine.schema,
      maxTokens: engine.maxTokens,
      timeoutMs: engine.timeoutMs,
      temperature: 0.2,
    };
    const t0 = Date.now();
    const resp1 = await adapter.complete(req);
    const first = forceJSON(resp1.rawText);
    let parsed = first.ok ? first.parsed : undefined;
    let attempt = 1;
    let rawUsed = resp1.rawText;
    let latUsed = resp1.latencyMs ?? Date.now() - t0;
    let resp2: typeof resp1 | undefined;

    if (!first.ok) {
      attempt = 2;
      const repairReq = {
        ...req,
        user: `Return ONLY valid JSON for this schema (no prose):\n${JSON.stringify(engine.schema)}\n\nPrevious response:\n${resp1.rawText}`,
      };
      resp2 = await adapter.complete(repairReq);
      const second = forceJSON(resp2.rawText);
      if (second.ok) {
        parsed = second.parsed;
        rawUsed = resp2.rawText;
        latUsed = resp2.latencyMs ?? 0;
      }
      // Track tokens
      totalTokensIn += (resp1.tokensIn ?? 0) + (resp2.tokensIn ?? 0);
      totalTokensOut += (resp1.tokensOut ?? 0) + (resp2.tokensOut ?? 0);
    } else {
      totalTokensIn += resp1.tokensIn ?? 0;
      totalTokensOut += resp1.tokensOut ?? 0;
    }

    const schemaCheck = parsed ? validateAgainstSchema(parsed, engine.schema) : { ok: false, error: 'Invalid JSON' };

    // Always write turn log
    const turnLog = {
      turn: turnIndex,
      attempt,
      prompt: req.user,
      rawText: rawUsed,
      parsed,
      validJSON: Boolean(schemaCheck.ok),
      latencyMs: latUsed ?? 0,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      model: modelName,
      game: engine.name,
      phase: (state as any).phase ?? null,
    };

    let nextState = state;
    if (schemaCheck.ok) {
      try {
        const applied = engine.applyAction(state, parsed as A);
        nextState = applied.state;
        if (applied.turnMeta) {
          Object.assign(turnLog, { turnMeta: applied.turnMeta });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : 'applyAction error';
        Object.assign(turnLog, { error: err });
        state = nextState; // keep old state
        appendTurnLine(new Date().toISOString(), `${modelName}_${engine.name}`, turnLog);
        turns.push(turnLog);
        break;
      }
    } else {
      Object.assign(turnLog, { error: schemaCheck.error });
      state = nextState; // keep old state
      appendTurnLine(new Date().toISOString(), `${modelName}_${engine.name}`, turnLog);
      turns.push(turnLog);

      const final = engine.score(state);
      const finishedAt = new Date().toISOString();
      const result: MatchResult = {
        ...final,
        model: modelName,
        seed,
        startedAt,
        finishedAt,
        costUSD: totalCost + (totalTokensIn / 1000) * (priceUsdPer1kTokensIn || price.in) + (totalTokensOut / 1000) * (priceUsdPer1kTokensOut || price.out),
        turns,
        meta: { lastError: schemaCheck.error },
      };
      appendRunLine(finishedAt, `${modelName}_${engine.name}`, result);
      // Dev debugging summary
      // eslint-disable-next-line no-console
      console.log(`[match] ${engine.name} × ${modelName} → success=${result.success} score=${result.score.toFixed(2)} cost=$${(result.costUSD ?? 0).toFixed(4)}`);
      return result;
    }

    state = nextState;
    appendTurnLine(new Date().toISOString(), `${modelName}_${engine.name}`, turnLog);
    turns.push(turnLog);
    turnIndex += 1;
  }

  const finishedAt = new Date().toISOString();
  const base = engine.score(state);
  const costUSD = totalCost + (totalTokensIn / 1000) * (priceUsdPer1kTokensIn || price.in) + (totalTokensOut / 1000) * (priceUsdPer1kTokensOut || price.out);
  const result: MatchResult = { ...base, model: modelName, seed, startedAt, finishedAt, costUSD, turns };
  appendRunLine(finishedAt, `${modelName}_${engine.name}`, result);
  // Dev debugging summary
  // eslint-disable-next-line no-console
  console.log(`[match] ${engine.name} × ${modelName} → success=${result.success} score=${result.score.toFixed(2)} cost=$${(result.costUSD ?? 0).toFixed(4)}`);
  return result;
}



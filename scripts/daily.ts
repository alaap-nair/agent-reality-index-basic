import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { todaySeed } from '@/lib/presets/today';
import { getAdapter } from '@/lib/models/registry';
import { playMatch } from '@/lib/orchestrator/runner';
import { saveDailyCard } from '@/lib/social/card';
import { readLatestDayFiles } from '@/lib/storage';
import { battleshipLiteEngine } from '@/lib/engine/battleshipLite';
import { deductionEngine } from '@/lib/engine/deduction';
import { sequenceRecallEngine } from '@/lib/engine/sequenceRecall';
import { wordgridEngine } from '@/lib/engine/wordgrid';

function sanitizeStem(stem: string): string {
  return stem.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

async function main() {
  const seed = todaySeed();
  const models = ['simulated', 'fal:any-llm:openai/gpt-4o-mini'];
  const engines = [
    wordgridEngine,
    deductionEngine,
    battleshipLiteEngine,
    sequenceRecallEngine,
  ] as const;

  const failures: string[] = [];

  for (const model of models) {
    for (const engine of engines) {
      try {
        const adapter = getAdapter(model);
        const res = await playMatch(engine as any, adapter, seed, model);

        // Basic assertions on MatchResult
        if (!res || typeof res.model !== 'string' || typeof res.game !== 'string') {
          throw new Error('Invalid MatchResult shape');
        }
        if (res.seed !== seed) throw new Error(`Seed mismatch: expected ${seed}, got ${res.seed}`);
        if (typeof res.score !== 'number') throw new Error('Score missing');
        if (!Array.isArray(res.turns) || res.turns.length <= 0) throw new Error('No turns recorded');

        // Print result summary
        // eslint-disable-next-line no-console
        console.log(`${res.game} ${res.model} turns=${res.turns.length} score=${res.score.toFixed(2)} success=${res.success}`);

        // Assert a JSONL line exists for this run
        const latest = readLatestDayFiles();
        if (!latest) throw new Error('No runs directory present');
        const stem = sanitizeStem(`${model}_${engine.name}`) + '.jsonl';
        const file = latest.files.find((f) => f.file === stem);
        if (!file || file.lines.length <= 0) throw new Error(`No JSONL written for ${stem}`);

        // eslint-disable-next-line no-console
        console.log(`[smoke] OK: ${engine.name} × ${model}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`${engine.name} × ${model}: ${msg}`);
        // eslint-disable-next-line no-console
        console.error(`[smoke] FAIL: ${engine.name} × ${model}:`, msg);
      }
    }
  }

  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Smoke failed (${failures.length}):`);
    for (const f of failures) console.error(' -', f);
    process.exit(1);
  }

  // Generate social card
  await saveDailyCard();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Smoke crashed:', err);
  process.exit(1);
});
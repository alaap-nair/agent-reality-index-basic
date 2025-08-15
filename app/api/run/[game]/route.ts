import { NextResponse } from 'next/server';
import { battleshipLiteEngine } from '@/lib/engine/battleshipLite';
import { deductionEngine } from '@/lib/engine/deduction';
import { sequenceRecallEngine } from '@/lib/engine/sequenceRecall';
import { wordgridEngine } from '@/lib/engine/wordgrid';
import { playMatch } from '@/lib/orchestrator/runner';
import { getAdapter } from '@/lib/models/registry';
import { GameEngine } from '@/lib/types';

const engines: Record<string, GameEngine<unknown, unknown>> = {
  wordgrid: wordgridEngine,
  deduction: deductionEngine,
  battleshipLite: battleshipLiteEngine,
  sequenceRecall: sequenceRecallEngine,
};

export async function POST(req: Request) {
  const url = new URL(req.url);
  // Expecting /api/run/{game}
  const segments = url.pathname.split('/').filter(Boolean);
  const game = segments[segments.length - 1];
  const engine = engines[game];
  if (!engine) return NextResponse.json({ error: 'unknown game' }, { status: 404 });
  let seed = Number(Date.now() % 1000);
  let models: string[] = ['simulated'];
  try {
    const bodyUnknown = await req.json();
    if (typeof bodyUnknown === 'object' && bodyUnknown !== null) {
      const b = bodyUnknown as Record<string, unknown>;
      if ('seed' in b) {
        const v = b.seed;
        if (typeof v === 'number' || typeof v === 'string') seed = Number(v);
      }
      if (Array.isArray(b.models)) {
        models = b.models.filter((m): m is string => typeof m === 'string' && m.length > 0);
      }
    }
  } catch {}
  const results = await Promise.all(
    models.map(async (modelName) => {
      const adapter = getAdapter(modelName);
      const res = await playMatch(engine as GameEngine<unknown, unknown>, adapter, seed, modelName);
      return res;
    })
  );
  return NextResponse.json(results);
}



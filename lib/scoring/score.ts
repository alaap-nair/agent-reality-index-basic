import { MatchResult } from '@/lib/types';

export function aggregate(results: MatchResult[]) {
  const byModelGame = new Map<string, MatchResult[]>();
  for (const r of results) {
    const key = `${r.model}::${r.game}`;
    const list = byModelGame.get(key) ?? [];
    list.push(r);
    byModelGame.set(key, list);
  }
  const rows = [] as {
    model: string;
    game: string;
    score: number;
    successRate: number;
    avgLatency: number;
    costUSD: number;
  }[];
  for (const [key, list] of byModelGame) {
    const [model, game] = key.split('::');
    const score = list.reduce((a, b) => a + (b.score ?? 0), 0) / list.length;
    const successRate = list.filter((r) => r.success).length / list.length;
    const avgLatency =
      list
        .flatMap((r) => r.turns.map((t) => t.latencyMs))
        .reduce((a, b) => a + b, 0) / Math.max(1, list.flatMap((r) => r.turns).length);
    const showCost = process.env.ARENA_SHOW_COST === '1';
    const costUSD = showCost ? list.reduce((a, b) => a + (b.costUSD ?? 0), 0) : 0;
    rows.push({ model, game, score, successRate, avgLatency, costUSD });
  }
  return rows.sort((a, b) => a.model.localeCompare(b.model) || a.game.localeCompare(b.game));
}



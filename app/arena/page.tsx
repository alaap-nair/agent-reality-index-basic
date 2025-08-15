export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';

type ScoreRow = { model: string; game: string; score: number; successRate: number; avgLatency: number; costUSD: number };
type ScoreResponse = { date: string | null; rows: ScoreRow[] };

async function getScoreboard(): Promise<ScoreResponse> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  
  // Use absolute URL to avoid fetch issues
  const url = `${protocol}://${host}/api/scoreboard`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { date: null, rows: [] };
  return res.json();
}

export default async function ArenaPage() {
  const data = await getScoreboard();
  const rows = data.rows ?? [];
  const models = Array.from(new Set(rows.map((r) => r.model))).sort();
  const games = Array.from(new Set(rows.map((r) => r.game))).sort();
  const cell = (m: string, g: string) => rows.find((r) => r.model === m && r.game === g);
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Arena</h1>
      <p className="text-sm text-gray-500">Date: {data?.date ?? 'n/a'}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Model \ Game</th>
              {games.map((g) => (
                <th key={g} className="p-2 text-left">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m} className="border-t">
                <td className="p-2 font-medium">{m}</td>
                {games.map((g) => {
                  const c = cell(m, g);
                  return (
                    <td key={g} className="p-2">
                      {c ? (
                        <div className="space-y-1 text-sm">
                          <div><span className="font-semibold">score</span>: {c.score.toFixed(2)}</div>
                          <div><span className="font-semibold">success</span>: {(c.successRate * 100).toFixed(0)}%</div>
                          <div><span className="font-semibold">avgLatency</span>: {Math.round(c.avgLatency)}ms</div>
                          <div><span className="font-semibold">cost</span>: ${c.costUSD.toFixed(4)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
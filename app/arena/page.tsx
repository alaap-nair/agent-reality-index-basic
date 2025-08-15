export const dynamic = 'force-dynamic';
import { headers } from 'next/headers';
import Link from 'next/link';
import GamePreview from '@/components/games/GamePreview';
import RefreshButton from '@/components/ui/RefreshButton';

type ScoreRow = { model: string; game: string; score: number; successRate: number; avgLatency: number; costUSD: number };
type ScoreResponse = { date: string | null; rows: ScoreRow[] };

async function getScoreboard(): Promise<ScoreResponse> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  
  const url = `${protocol}://${host}/api/scoreboard`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { date: null, rows: [] };
  return res.json();
}

function GameCard({ game, models, scores }: { game: string; models: string[]; scores: ScoreRow[] }) {
  const gameScores = scores.filter(s => s.game === game);
  const bestScore = Math.max(...gameScores.map(s => s.score));
  const bestModel = gameScores.find(s => s.score === bestScore);
  const avgSuccess = gameScores.reduce((acc, s) => acc + s.successRate, 0) / gameScores.length;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold">{game}</h3>
          <Link 
            href={`/games/${game.toLowerCase()}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Play Demo →
          </Link>
        </div>
        <div className="w-32">
          <GamePreview game={game} />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Best Score</span>
          <span className="font-medium">{bestScore.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Best Model</span>
          <span className="font-medium">{bestModel?.model || 'N/A'}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Success Rate</span>
          <span className="font-medium">{(avgSuccess * 100).toFixed(0)}%</span>
        </div>
        
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Model Performance</div>
          <div className="space-y-2">
            {models.map(model => {
              const score = gameScores.find(s => s.model === model);
              if (!score) return null;
              const percentage = (score.score / bestScore) * 100;
              return (
                <div key={model} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{model}</span>
                    <span>{score.score.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-gray-600 text-sm mb-2">{title}</h3>
      <div className="text-2xl font-semibold mb-2">{value}</div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default async function ArenaPage() {
  const data = await getScoreboard();
  const rows = data.rows ?? [];
  const models = Array.from(new Set(rows.map((r) => r.model))).sort();
  const games = Array.from(new Set(rows.map((r) => r.game))).sort();
  
  // Calculate insights
  const totalRuns = rows.length;
  const avgSuccess = (rows.reduce((acc, r) => acc + r.successRate, 0) / rows.length * 100).toFixed(0);
  const bestPerformer = rows.reduce((acc, r) => r.score > acc.score ? r : acc, rows[0]);
  const totalCost = rows.reduce((acc, r) => acc + r.costUSD, 0).toFixed(4);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Arena Dashboard</h1>
            <p className="text-gray-600">Last updated: {data?.date ?? 'n/a'}</p>
          </div>
          <RefreshButton />
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <InsightCard
            title="Total Runs"
            value={totalRuns.toString()}
            description="Number of game sessions completed"
          />
          <InsightCard
            title="Average Success Rate"
            value={`${avgSuccess}%`}
            description="Across all models and games"
          />
          <InsightCard
            title="Best Performance"
            value={`${bestPerformer?.score.toFixed(2) ?? 'N/A'}`}
            description={`${bestPerformer?.model ?? 'N/A'} on ${bestPerformer?.game ?? 'N/A'}`}
          />
          <InsightCard
            title="Total Cost"
            value={`$${totalCost}`}
            description="Cumulative API costs"
          />
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map(game => (
            <GameCard
              key={game}
              game={game}
              models={models}
              scores={rows}
            />
          ))}
        </div>

        {/* Detailed Table */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Detailed Results</h2>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  {games.map((g) => (
                    <th key={g} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{g}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {models.map((m) => (
                  <tr key={m} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m}</td>
                    {games.map((g) => {
                      const c = rows.find((r) => r.model === m && r.game === g);
                      return (
                        <td key={g} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {c ? (
                            <div className="space-y-1">
                              <div><span className="font-medium">Score:</span> {c.score.toFixed(2)}</div>
                              <div><span className="font-medium">Success:</span> {(c.successRate * 100).toFixed(0)}%</div>
                              <div><span className="font-medium">Latency:</span> {Math.round(c.avgLatency)}ms</div>
                              <div><span className="font-medium">Cost:</span> ${c.costUSD.toFixed(4)}</div>
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
      </div>
    </div>
  );
}
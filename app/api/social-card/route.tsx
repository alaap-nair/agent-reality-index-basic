import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { readLatestDayFiles } from '@/lib/storage';

// Remove edge runtime - we need filesystem access
// export const runtime = 'edge';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function parseScores(files: { file: string; lines: string[] }[]) {
  const scores = new Map<string, { model: string; score: number }>();
  for (const file of files) {
    const [model, game] = file.file.replace('.jsonl', '').split('_');
    if (!model || !game) continue;
    for (const line of file.lines) {
      try {
        const run = JSON.parse(line);
        const current = scores.get(game);
        if (!current || run.score > current.score) {
          scores.set(game, { model, score: run.score });
        }
      } catch {}
    }
  }
  return scores;
}

export async function GET(req: NextRequest) {
  const latest = readLatestDayFiles();
  if (!latest) {
    return new Response('No data', { status: 404 });
  }

  const scores = parseScores(latest.files);
  const games = Array.from(scores.keys()).sort();

  return new ImageResponse(
    (
      <div
        tw="flex flex-col items-center justify-center w-[1200px] h-[630px] bg-gray-900 text-white font-sans"
      >
        <div tw="text-5xl mb-6 text-gray-400">
          {formatDate(latest.date)}
        </div>

        <div tw="flex flex-col gap-4">
          {games.map((game) => {
            const best = scores.get(game);
            if (!best) return null;
            return (
              <div
                key={game}
                tw="flex items-center gap-4 text-3xl"
              >
                <div tw="w-[200px] text-right text-gray-400">
                  {game}
                </div>
                <div tw="w-[400px]">{best.model}</div>
                <div tw="w-[100px] text-right text-emerald-500">
                  {best.score.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>

        <div tw="absolute bottom-5 text-2xl text-gray-600">
          judgmentlabs.ai/arena
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
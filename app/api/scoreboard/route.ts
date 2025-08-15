import { NextResponse } from 'next/server';
import { readLatestDayFiles, seedPlaceholderRunsIfEmpty } from '@/lib/storage';
import { aggregate } from '@/lib/scoring/score';

export async function GET() {
  seedPlaceholderRunsIfEmpty();
  const latest = readLatestDayFiles();
  if (!latest) return NextResponse.json({ date: null, rows: [] });
  const all = latest.files.flatMap((f) => f.lines.map((l) => JSON.parse(l)));
  const rows = aggregate(all);
  return NextResponse.json({ date: latest.date, rows });
}



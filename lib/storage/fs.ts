import fs from 'node:fs';
import path from 'node:path';

const runsRoot = path.join(process.cwd(), 'runs');

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONValue[] | { [k: string]: JSONValue };

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeStem(stem: string): string {
  // Replace any path separators and unsafe chars with '-'
  return stem.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

export function appendRunLine(dateISO: string, fileStem: string, payload: unknown) {
  const date = dateISO.slice(0, 10); // YYYY-MM-DD
  const dayDir = path.join(runsRoot, date);
  ensureDir(dayDir);
  const safeStem = sanitizeStem(fileStem);
  const filePath = path.join(dayDir, `${safeStem}.jsonl`);
  const line = JSON.stringify(payload);
  fs.appendFileSync(filePath, line + '\n', { encoding: 'utf8' });
}

export function readLatestDayFiles(): { date: string; files: { file: string; lines: string[] }[] } | null {
  if (!fs.existsSync(runsRoot)) return null;
  const days = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const latest = days[days.length - 1];
  if (!latest) return null;
  const latestDir = path.join(runsRoot, latest);
  const files = fs
    .readdirSync(latestDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => {
      const p = path.join(latestDir, f);
      const content = fs.readFileSync(p, 'utf8');
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      return { file: f, lines };
    });
  return { date: latest, files };
}

export function readTurnsFor(dateISO: string, fileStem: string): { date: string; lines: string[] } | null {
  const date = dateISO.slice(0, 10);
  const dayDir = path.join(runsRoot, date);
  const turnsDir = path.join(dayDir, 'turns');
  if (!fs.existsSync(turnsDir)) return null;
  const safeStem = sanitizeStem(fileStem);
  const filePath = path.join(turnsDir, `${safeStem}.jsonl`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return { date, lines };
}

export function readLatestTurns(fileStem: string): { date: string; lines: string[] } | null {
  if (!fs.existsSync(runsRoot)) return null;
  const days = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const latest = days[days.length - 1];
  if (!latest) return null;
  return readTurnsFor(latest, fileStem);
}

export function seedPlaceholderRunsIfEmpty() {
  ensureDir(runsRoot);
  const latest = readLatestDayFiles();
  if (latest && latest.files.length > 0) return; // already have data
  const date = new Date().toISOString();
  const placeholder = {
    game: 'wordgrid',
    model: 'simulated',
    seed: 42,
    startedAt: date,
    finishedAt: date,
    success: true,
    score: 0.7,
    meta: { avgLatency: 1200 },
    turns: [],
    costUSD: 0,
  };
  appendRunLine(date, 'simulated_wordgrid', placeholder);
}

export function appendTurnLine(dateISO: string, fileStem: string, payload: unknown) {
  const date = dateISO.slice(0, 10);
  const dayDir = path.join(runsRoot, date);
  const turnsDir = path.join(dayDir, 'turns');
  ensureDir(turnsDir);
  const safeStem = sanitizeStem(fileStem);
  const filePath = path.join(turnsDir, `${safeStem}.jsonl`);
  const line = JSON.stringify(payload);
  fs.appendFileSync(filePath, line + '\n', { encoding: 'utf8' });
}
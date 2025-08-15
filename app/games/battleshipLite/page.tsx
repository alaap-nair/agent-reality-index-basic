'use client';

import { readLatestTurns } from '@/lib/storage';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

type Phase = 'placeP1' | 'placeP2' | 'fire';
type Player = 'P1' | 'P2';
type Ship = { r: number; c: number; dir: 'H' | 'V' };
type Shot = { by: Player; r: number; c: number; result: 'hit' | 'miss' | 'sunk' };

type Turn = {
  turn: number;
  phase: Phase;
  model: string;
  game: string;
  rawText: string;
  parsed?: { action: 'place' | 'fire'; r?: number; c?: number; ships?: Ship[] };
  turnMeta?: { type: 'place'; ok: true } | { type: 'fire'; result: 'hit' | 'miss' | 'sunk' };
};

function parseTurns(model?: string, seed?: string) {
  const stem = `${model ?? 'simulated'}_battleshipLite`;
  const result = readLatestTurns(stem);
  if (!result) return [] as Turn[];
  const turns: Turn[] = [];
  for (const line of result.lines) {
    try {
      const turn = JSON.parse(line);
      turns.push(turn);
    } catch {}
  }
  return turns;
}

function Cell({ value, onClick }: { value: number; onClick?: () => void }) {
  // 0=empty, 1=ship, 2=hit, 3=miss
  const bg = value === 0 ? 'bg-white' : value === 1 ? 'bg-blue-200' : value === 2 ? 'bg-red-500' : 'bg-gray-400';
  return (
    <td className={`w-8 h-8 border ${bg} text-center`} onClick={onClick}>
      {value === 2 ? '×' : value === 3 ? '•' : ''}
    </td>
  );
}

function Board({ grid }: { grid: number[][] }) {
  return (
    <table className="border-collapse">
      <tbody>
        {grid.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => (
              <Cell key={c} value={cell} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TurnText({ t }: { t: Turn }) {
  if (t.parsed?.action === 'place') {
    const ships = t.parsed.ships ?? [];
    return (
      <span>
        {t.phase} place ships at{' '}
        {ships.map((s, i) => (
          <span key={i}>
            {i > 0 ? ', ' : ''}({s.r},{s.c}) {s.dir}
          </span>
        ))}
      </span>
    );
  }
  if (t.parsed?.action === 'fire') {
    const { r = -1, c = -1 } = t.parsed;
    const result = t.turnMeta?.type === 'fire' ? t.turnMeta.result : 'unknown';
    return (
      <span>
        fire at ({r},{c}) → {result}
      </span>
    );
  }
  return null;
}

function applyTurns(turns: Turn[], upTo: number): [number[][], number[][]] {
  const boardP1 = Array.from({ length: 5 }, () => Array(5).fill(0));
  const boardP2 = Array.from({ length: 5 }, () => Array(5).fill(0));

  for (let i = 0; i <= upTo && i < turns.length; i += 1) {
    const t = turns[i];
    if (t.parsed?.action === 'place') {
      const board = t.phase === 'placeP1' ? boardP1 : boardP2;
      for (const ship of t.parsed.ships ?? []) {
        const cells = [];
        for (let j = 0; j < 2; j += 1) {
          const r = ship.dir === 'V' ? ship.r + j : ship.r;
          const c = ship.dir === 'H' ? ship.c + j : ship.c;
          cells.push([r, c]);
        }
        for (const [r, c] of cells) {
          if (r >= 0 && c >= 0 && r < 5 && c < 5) board[r][c] = 1;
        }
      }
    } else if (t.parsed?.action === 'fire' && t.turnMeta?.type === 'fire') {
      const { r = -1, c = -1 } = t.parsed;
      const board = t.phase === 'fire' && t.parsed.r !== undefined ? (t.turnMeta.by === 'P1' ? boardP2 : boardP1) : null;
      if (board && r >= 0 && c >= 0 && r < 5 && c < 5) {
        board[r][c] = t.turnMeta.result === 'miss' ? 3 : 2;
      }
    }
  }

  return [boardP1, boardP2];
}

export default function BattleshipLitePage({ searchParams }: { searchParams: { model?: string; seed?: string } }) {
  const { model, seed } = searchParams;
  const turns = useMemo(() => parseTurns(model, seed), [model, seed]);
  const [step, setStep] = useState(turns.length - 1);

  const [boardP1, boardP2] = useMemo(() => applyTurns(turns, step), [turns, step]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Battleship Lite Replay</h1>
      <div className="text-sm text-gray-600">
        Model: {model ?? 'simulated'} | Seed: {seed ?? '(latest)'} | Turns: {turns.length}
      </div>

      <div className="flex gap-8">
        <div>
          <h2 className="font-semibold mb-2">Player 1 Board</h2>
          <Board grid={boardP1} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Player 2 Board</h2>
          <Board grid={boardP2} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Turn {step + 1} of {turns.length}</h2>
        <input
          type="range"
          min={-1}
          max={turns.length - 1}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-sm space-y-1">
          {turns.slice(0, step + 1).map((t, i) => (
            <div key={i} className={i === step ? 'font-bold' : ''}>
              #{i + 1} <TurnText t={t} />
            </div>
          ))}
        </div>
      </div>

      <Link className="text-blue-600 underline" href="/arena">
        Back to Arena
      </Link>
    </div>
  );
}
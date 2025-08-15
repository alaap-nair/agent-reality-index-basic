import { GameEngine, MatchResult } from '@/lib/types';

type Dir = 'H' | 'V';
type Phase = 'placeP1' | 'placeP2' | 'fire';
type Player = 'P1' | 'P2';
type Ship = { r: number; c: number; dir: Dir };
type Shot = { by: Player; r: number; c: number; result: 'hit' | 'miss' | 'sunk' };

export type BSState = {
  phase: Phase;
  current: Player;
  boardP1: number[][]; // 5x5 ints (0 empty, 1 ship, 2 hit, 3 miss)
  boardP2: number[][];
  shots: Shot[];
  placed: { P1: boolean; P2: boolean };
  over: boolean;
  winner?: Player;
};

type Action = { action: 'place' | 'fire'; r?: number; c?: number; ships?: Ship[] };
type TurnMeta = { type: 'place'; ok: true } | { type: 'fire'; result: 'hit' | 'miss' | 'sunk' };

function shipCells(s: Ship): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < 2; i += 1) {
    const r = s.dir === 'V' ? s.r + i : s.r;
    const c = s.dir === 'H' ? s.c + i : s.c;
    cells.push([r, c]);
  }
  return cells;
}

function neighbors8(r: number, c: number, size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nr = r + dy;
      const nc = c + dx;
      if (nr >= 0 && nc >= 0 && nr < size && nc < size) out.push([nr, nc]);
    }
  }
  return out;
}

function validateFleet(ships: Ship[], board: number[][]): boolean {
  if (!Array.isArray(ships) || ships.length !== 2) return false;
  const size = board.length;
  const occupied = new Set<string>(); // r,c strings for O(1) lookup
  const blocked = new Set<string>();
  for (const ship of ships) {
    if (ship.dir !== 'H' && ship.dir !== 'V') return false;
    const cells = shipCells(ship);
    for (const [r, c] of cells) {
      if (r < 0 || c < 0 || r >= size || c >= size) return false;
    }
    for (const [r, c] of cells) {
      const key = `${r},${c}`;
      if (occupied.has(key) || blocked.has(key)) return false;
    }
    for (const [r, c] of cells) {
      const key = `${r},${c}`;
      occupied.add(key);
      for (const [nr, nc] of neighbors8(r, c, size)) blocked.add(`${nr},${nc}`);
    }
  }
  return true;
}

function placeShips(board: number[][], ships: Ship[]): void {
  for (const ship of ships) {
    for (const [r, c] of shipCells(ship)) {
      board[r][c] = 1;
    }
  }
}

function checkSunk(board: number[][], r: number, c: number): boolean {
  // Check if this hit sunk a ship by looking for any remaining unhit ship cells
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nc >= 0 && nr < board.length && nc < board[0].length) {
        if (board[nr][nc] === 1) return false; // found an unhit ship cell
        if (board[nr][nc] !== 2) break; // stop at non-hit cells
        nr += dr;
        nc += dc;
      }
    }
  }
  return true;
}

export const battleshipLiteEngine: GameEngine<BSState, Action> = {
  name: 'battleshipLite',
  systemPrompt:
    'Battleship Lite: Two players take turns placing ships then firing shots. Return ONLY JSON.',
  schema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['place', 'fire'] },
      r: { type: 'integer', minimum: 0, maximum: 4 },
      c: { type: 'integer', minimum: 0, maximum: 4 },
      ships: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            r: { type: 'integer', minimum: 0, maximum: 4 },
            c: { type: 'integer', minimum: 0, maximum: 4 },
            dir: { type: 'string', enum: ['H', 'V'] },
          },
          required: ['r', 'c', 'dir'],
          additionalProperties: false,
        },
        minItems: 2,
        maxItems: 2,
      },
    },
    additionalProperties: false,
  },
  maxTokens: 16,
  timeoutMs: 5000,
  init(seed: number) {
    return {
      phase: 'placeP1',
      current: 'P1',
      boardP1: Array.from({ length: 5 }, () => Array(5).fill(0)),
      boardP2: Array.from({ length: 5 }, () => Array(5).fill(0)),
      shots: [],
      placed: { P1: false, P2: false },
      over: false,
    };
  },
  isOver(s) {
    return s.over;
  },
  buildPrompt(s) {
    if (s.phase === 'placeP1' || s.phase === 'placeP2') {
      return [
        `Player ${s.current}: Place two length-2 ships on your board.`,
        'Ships cannot overlap or touch (even diagonally).',
        'Example: {"action":"place","ships":[{"r":0,"c":0,"dir":"H"},{"r":2,"c":2,"dir":"V"}]}',
      ].join('\n');
    }
    // Show only this player's shots
    const myShots = s.shots.filter((shot) => shot.by === s.current);
    const shotMap = Array.from({ length: 5 }, () => Array(5).fill('.'));
    for (const shot of myShots) {
      shotMap[shot.r][shot.c] = shot.result === 'hit' || shot.result === 'sunk' ? 'H' : 'M';
    }
    const lines = shotMap.map((row) => row.join(' ')).join('\n');
    return [
      `Player ${s.current}'s turn to fire.`,
      'Your shot history (H=hit/sunk, M=miss):',
      lines,
      'Fire at {r,c}: {"action":"fire","r":0-4,"c":0-4}',
    ].join('\n');
  },
  applyAction(s, a) {
    if (s.phase === 'placeP1' || s.phase === 'placeP2') {
      if (a.action !== 'place' || !Array.isArray(a.ships)) throw new Error('illegal move');
      const board = s.phase === 'placeP1' ? s.boardP1 : s.boardP2;
      if (!validateFleet(a.ships, board)) throw new Error('illegal move');
      placeShips(board, a.ships);
      const next: BSState = { ...s, placed: { ...s.placed } };
      if (s.phase === 'placeP1') {
        next.placed.P1 = true;
        next.phase = 'placeP2';
        next.current = 'P2';
      } else {
        next.placed.P2 = true;
        next.phase = 'fire';
        next.current = 'P1';
      }
      return { state: next, turnMeta: { type: 'place', ok: true } };
    }

    // Fire phase
    if (a.action !== 'fire' || typeof a.r !== 'number' || typeof a.c !== 'number') throw new Error('illegal move');
    const { r, c } = a;
    if (r < 0 || c < 0 || r >= 5 || c >= 5) throw new Error('illegal move');
    if (s.shots.some((shot) => shot.r === r && shot.c === c)) throw new Error('illegal move');

    const targetBoard = s.current === 'P1' ? s.boardP2 : s.boardP1;
    const next: BSState = { ...s, shots: [...s.shots], boardP1: s.boardP1.map((row) => [...row]), boardP2: s.boardP2.map((row) => [...row]) };

    let result: Shot['result'] = 'miss';
    if (targetBoard[r][c] === 1) {
      targetBoard[r][c] = 2; // mark as hit
      result = checkSunk(targetBoard, r, c) ? 'sunk' : 'hit';
    } else {
      targetBoard[r][c] = 3; // mark as miss
    }
    next.shots.push({ by: s.current, r, c, result });

    // Check win condition: all opponent's ship cells (1s) are now hits (2s)
    if (result === 'sunk' && !targetBoard.some((row) => row.includes(1))) {
      next.over = true;
      next.winner = s.current;
    } else {
      next.current = s.current === 'P1' ? 'P2' : 'P1';
    }

    return { state: next, turnMeta: { type: 'fire', result } };
  },
  score(s): MatchResult {
    return {
      game: 'battleshipLite',
      model: 'unknown',
      seed: 0,
      startedAt: '',
      finishedAt: '',
      success: true,
      score: s.winner === 'P1' ? 1 : 0,
      turns: [],
      meta: { turns: s.shots.length, winner: s.winner ?? null },
    };
  },
};
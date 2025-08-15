type BoardCell = 0 | 1 | 2 | 3; // 0=empty, 1=ship, 2=hit, 3=miss

interface BattleshipVisualProps {
  board: BoardCell[][];
  shots: Array<{ r: number; c: number; result: 'hit' | 'miss' | 'sunk' }>;
  isPreview?: boolean;
}

export default function BattleshipVisual({ board, shots, isPreview = false }: BattleshipVisualProps) {
  return (
    <div className={`grid grid-cols-5 gap-1 ${isPreview ? 'w-32' : 'w-48'}`}>
      {board.map((row, r) => 
        row.map((cell, c) => {
          const shot = shots.find(s => s.r === r && s.c === c);
          const cellState = shot ? (shot.result === 'miss' ? 3 : 2) : cell;
          
          return (
            <div 
              key={`${r}-${c}`}
              className={`
                ${isPreview ? 'w-6 h-6' : 'w-8 h-8'}
                rounded flex items-center justify-center
                ${cellState === 0 ? 'bg-blue-100' : ''}
                ${cellState === 1 ? 'bg-gray-600' : ''}
                ${cellState === 2 ? 'bg-red-500' : ''}
                ${cellState === 3 ? 'bg-gray-300' : ''}
              `}
            >
              {cellState === 2 && (
                <span className="text-white text-xs">×</span>
              )}
              {cellState === 3 && (
                <span className="text-gray-600 text-xs">•</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

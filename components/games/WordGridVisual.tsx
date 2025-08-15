interface WordGridVisualProps {
  grid: string[];
  foundWords?: string[];
  latestPath?: number[];
  isPreview?: boolean;
}

export default function WordGridVisual({ grid, foundWords = [], latestPath = [], isPreview = false }: WordGridVisualProps) {
  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-4 gap-1 ${isPreview ? 'w-32' : 'w-48'}`}>
        {grid.map((letter, i) => {
          const isInPath = latestPath.includes(i);
          const cellSize = isPreview ? 'w-7 h-7' : 'w-10 h-10';
          
          return (
            <div 
              key={i}
              className={`
                ${cellSize}
                rounded-lg flex items-center justify-center
                ${isInPath ? 'bg-blue-500 text-white' : 'bg-gray-100'}
                font-medium uppercase
              `}
            >
              {letter}
            </div>
          );
        })}
      </div>
      
      {!isPreview && foundWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {foundWords.map((word, i) => (
            <span 
              key={i}
              className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

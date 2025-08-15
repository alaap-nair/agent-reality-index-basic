interface DeductionVisualProps {
  clues: string[];
  solution?: { color: string; shape: string };
  isPreview?: boolean;
}

export default function DeductionVisual({ clues, solution, isPreview = false }: DeductionVisualProps) {
  return (
    <div className="space-y-4">
      <div className={`space-y-2 ${isPreview ? 'text-sm' : ''}`}>
        {clues.map((clue, i) => (
          <div 
            key={i}
            className="flex items-start gap-2"
          >
            <span className="text-gray-500">{i + 1}.</span>
            <span>{clue}</span>
          </div>
        ))}
      </div>

      {solution && (
        <div className="flex items-center gap-4 mt-4">
          <div className={`
            ${isPreview ? 'w-6 h-6' : 'w-8 h-8'}
            rounded-full
            ${solution.color === 'red' ? 'bg-red-500' : ''}
            ${solution.color === 'blue' ? 'bg-blue-500' : ''}
            ${solution.color === 'green' ? 'bg-green-500' : ''}
          `} />
          
          <div className={`
            ${isPreview ? 'w-6 h-6' : 'w-8 h-8'}
            ${solution.shape === 'circle' ? 'rounded-full border-2' : ''}
            ${solution.shape === 'square' ? 'border-2' : ''}
            ${solution.shape === 'triangle' ? 'triangle' : ''}
            border-gray-600
          `} />
        </div>
      )}
    </div>
  );
}

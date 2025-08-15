interface SequenceVisualProps {
  sequence: number[];
  prediction?: number;
  isPreview?: boolean;
}

export default function SequenceVisual({ sequence, prediction, isPreview = false }: SequenceVisualProps) {
  return (
    <div className="flex items-center gap-2">
      {sequence.map((num, i) => (
        <div 
          key={i}
          className={`
            ${isPreview ? 'w-6 h-6 text-sm' : 'w-8 h-8'}
            rounded bg-blue-100 text-blue-700
            flex items-center justify-center font-medium
          `}
        >
          {num}
        </div>
      ))}
      
      <div className="text-gray-400 mx-1">→</div>
      
      <div 
        className={`
          ${isPreview ? 'w-6 h-6 text-sm' : 'w-8 h-8'}
          rounded 
          ${prediction !== undefined ? 'bg-green-100 text-green-700' : 'bg-gray-100'}
          flex items-center justify-center font-medium
        `}
      >
        {prediction !== undefined ? prediction : '?'}
      </div>
    </div>
  );
}

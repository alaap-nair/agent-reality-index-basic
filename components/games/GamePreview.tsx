import BattleshipVisual from './BattleshipVisual';
import WordGridVisual from './WordGridVisual';
import DeductionVisual from './DeductionVisual';
import SequenceVisual from './SequenceVisual';

// Example game states for previews
const PREVIEWS = {
  BattleshipLite: {
    board: [
      [0,1,1,0,0],
      [0,0,0,0,0],
      [0,0,1,1,0],
      [0,0,0,0,0],
      [0,0,0,0,0],
    ] as const,
    shots: [
      { r: 0, c: 1, result: 'hit' as const },
      { r: 1, c: 1, result: 'miss' as const },
    ]
  },
  WordGrid: {
    grid: ['c','a','t','s','d','o','g','s','b','i','r','d','f','i','s','h'],
    foundWords: ['cat', 'dog', 'bird'],
    latestPath: [0,1,2] // 'cat'
  },
  Deduction: {
    clues: [
      'The color is not red',
      'The shape is not circle',
      'If green then square',
      'Triangle or blue',
      'Shape is triangle'
    ],
    solution: { color: 'blue', shape: 'triangle' }
  },
  SequenceRecall: {
    sequence: [1,1,2,3,5],
    prediction: 8
  }
};

interface GamePreviewProps {
  game: string;
  latestResult?: any; // Type this based on your game results
}

export default function GamePreview({ game, latestResult }: GamePreviewProps) {
  switch (game) {
    case 'BattleshipLite':
      return (
        <BattleshipVisual 
          {...PREVIEWS.BattleshipLite}
          isPreview
        />
      );
    
    case 'WordGrid':
      return (
        <WordGridVisual 
          {...PREVIEWS.WordGrid}
          isPreview
        />
      );
    
    case 'Deduction':
      return (
        <DeductionVisual 
          {...PREVIEWS.Deduction}
          isPreview
        />
      );
    
    case 'SequenceRecall':
      return (
        <SequenceVisual 
          {...PREVIEWS.SequenceRecall}
          isPreview
        />
      );
    
    default:
      return null;
  }
}

import React from 'react';
import { GameState } from '../types';
import { Bot, Trophy, Hexagon } from 'lucide-react';

interface GameGridProps {
  gameState: GameState;
}

const GameGrid: React.FC<GameGridProps> = ({ gameState }) => {
  const { gridSize, playerPos, goalPos, obstacles } = gameState;

  // Create grid cells
  const cells = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const isPlayer = playerPos.x === x && playerPos.y === y;
      const isGoal = goalPos.x === x && goalPos.y === y;
      const isObstacle = obstacles.some(obs => obs.x === x && obs.y === y);

      let content = null;
      if (isPlayer) {
        // Use percentage sizing for icons so they scale perfectly with the cell
        content = <Bot className="w-[60%] h-[60%] text-white animate-bounce" />;
      } else if (isGoal) {
        content = <Trophy className="w-[60%] h-[60%] text-yellow-500 animate-pulse" />;
      } else if (isObstacle) {
        content = <Hexagon className="w-[60%] h-[60%] text-gray-400 fill-gray-400" />;
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          // Enforce aspect-square on every cell
          className={`
            relative w-full aspect-square rounded-md md:rounded-xl lg:rounded-2xl flex items-center justify-center shadow-sm border border-pink-100
            ${isPlayer ? 'bg-purple-400 border-purple-400' : 'bg-white'}
            ${isGoal ? 'bg-pink-100 ring-2 md:ring-4 ring-pink-300 border-pink-200' : ''}
            ${!isPlayer && !isGoal ? 'bg-white/90' : ''}
          `}
        >
          {content}
        </div>
      );
    }
  }

  return (
    <div 
      // Optimized padding and gaps for 5x5 grid
      className="grid gap-1 md:gap-3 p-1 md:p-4 bg-pink-200 rounded-2xl md:rounded-3xl border-4 border-pink-300 w-full mx-auto"
      style={{ 
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        boxShadow: '0 6px 0 rgb(236,72,153)',
        aspectRatio: '1 / 1'
      }}
    >
      {cells}
    </div>
  );
};

export default GameGrid;
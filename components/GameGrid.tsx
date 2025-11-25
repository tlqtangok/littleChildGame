import React from 'react';
import { GameState, Position } from '../types';
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
        content = <Bot className="w-8 h-8 md:w-12 md:h-12 text-white animate-bounce" />;
      } else if (isGoal) {
        content = <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-500 animate-pulse" />;
      } else if (isObstacle) {
        content = <Hexagon className="w-8 h-8 md:w-12 md:h-12 text-gray-400 fill-gray-400" />;
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`
            relative w-full aspect-square rounded-2xl flex items-center justify-center shadow-sm
            ${isPlayer ? 'bg-purple-400' : 'bg-white'}
            ${isGoal ? 'bg-pink-100 ring-4 ring-pink-300' : ''}
            ${!isPlayer && !isGoal ? 'bg-white/80' : ''}
          `}
        >
          {content}
        </div>
      );
    }
  }

  return (
    <div 
      className="grid gap-3 p-4 bg-pink-200 rounded-3xl border-4 border-pink-300 w-full max-w-md mx-auto"
      style={{ 
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        boxShadow: '0 8px 0 rgb(236,72,153)' 
      }}
    >
      {cells}
    </div>
  );
};

export default GameGrid;
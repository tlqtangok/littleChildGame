export enum Screen {
  HOME = 'HOME',
  STORY = 'STORY',
  LEVEL_SELECT = 'LEVEL_SELECT',
  GAME = 'GAME',
  REWARD = 'REWARD'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  playerPos: Position;
  goalPos: Position;
  obstacles: Position[];
  gridSize: number;
}
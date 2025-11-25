import React, { useState, useEffect, useCallback } from 'react';
import { Screen, GameState, Direction, Position } from './types';
import { generateFriendlyExplanation, speakText, generateRewardSticker } from './services/geminiService';
import { 
  unlockAudioContext, 
  playClickSound, 
  playStepSound, 
  playBonkSound, 
  playWinSound, 
  playDeleteSound,
  playVictorySound
} from './services/audioUtils';
import GameGrid from './components/GameGrid';
import { 
  Play, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Volume2,
  Trophy,
  LayoutGrid,
  Home,
  Github,
  Star,
  Check
} from 'lucide-react';

// --- Level Definitions (Sorted Easy to Hard) ---
// ALL LEVELS ARE 5x5 (x: 0-4, y: 0-4)

const LEVELS: GameState[] = [
  // --- STAGE 1: BABY STEPS (Tutorials) ---
  
  // Level 1: One step Right
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 2 }, 
    goalPos: { x: 2, y: 2 }, 
    obstacles: [] 
  },
  
  // Level 2: Two steps Right
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 2 }, 
    goalPos: { x: 3, y: 2 }, 
    obstacles: [] 
  },
  
  // Level 3: Go Down (1 Step)
  { 
    gridSize: 5, 
    playerPos: { x: 2, y: 1 }, 
    goalPos: { x: 2, y: 2 }, 
    obstacles: [] 
  },
  
  // Level 4: Simple Turn (Down then Right)
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 1 }, 
    goalPos: { x: 2, y: 2 }, 
    obstacles: [{x:2,y:1}] // Blocks direct right path
  },
  
  // Level 5: Hop Over (Up, Right, Right, Down)
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 2 }, 
    goalPos: { x: 3, y: 2 }, 
    obstacles: [{ x: 2, y: 2 }] 
  },

  // --- STAGE 2: SIMPLE SHAPES ---

  // Level 6: The Corner (L shape)
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 1 }, 
    goalPos: { x: 3, y: 3 }, 
    obstacles: [{x:2,y:2}, {x:3,y:1}, {x:1,y:3}, {x:2,y:1}] 
  },
  
  // Level 7: The Tunnel (Straight line with walls)
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 2 }, 
    goalPos: { x: 4, y: 2 }, 
    obstacles: [
      {x:1,y:1}, {x:2,y:1}, {x:3,y:1},
      {x:1,y:3}, {x:2,y:3}, {x:3,y:3}
    ] 
  },
  
  // Level 8: U-Turn (Down, Right, Right, Up)
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 2 }, 
    goalPos: { x: 3, y: 2 }, 
    obstacles: [{x:2,y:2}, {x:2,y:1}] 
  }, 
  
  // Level 9: Dodge (Up, Right, Right, Down)
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 2 }, 
    goalPos: { x: 3, y: 2 }, 
    obstacles: [{x:2,y:2}, {x:2,y:3}] // Block bottom path, force top
  },
  
  // Level 10: Staircase
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 4 }, 
    goalPos: { x: 3, y: 1 }, 
    obstacles: [
        {x:1,y:4}, {x:2,y:4}, {x:3,y:4},
        {x:2,y:3}, {x:3,y:3},
        {x:3,y:2}
    ] 
  }, 

  // --- STAGE 3: INTERMEDIATE ---

  // Level 11: The Snake
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 1 }, 
    goalPos: { x: 4, y: 1 }, 
    obstacles: [
      {x:1,y:1}, {x:1,y:0}, 
      {x:3,y:1}, {x:3,y:2}, {x:3,y:3}
    ] 
  },
  
  // Level 12: Around the Lake
  { 
    gridSize: 5, 
    playerPos: { x: 2, y: 4 }, 
    goalPos: { x: 2, y: 0 }, 
    obstacles: [{x:2,y:2}, {x:2,y:3}, {x:1,y:2}, {x:3,y:2}] 
  },

  // Level 13: Spiral In
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 1 }, 
    goalPos: { x: 2, y: 2 }, 
    obstacles: [
        {x:1,y:1}, {x:2,y:1}, {x:3,y:1},
        {x:3,y:2}, {x:3,y:3},
        {x:2,y:3}
    ]
  }, 

  // Level 14: Zig Zag Up
  { 
    gridSize: 5, 
    playerPos: { x: 1, y: 4 }, 
    goalPos: { x: 3, y: 0 }, 
    obstacles: [
      {x:2,y:4}, {x:2,y:3}, 
      {x:1,y:2}, {x:0,y:2},
      {x:3,y:2}, {x:4,y:2}
    ] 
  },
  
  // Level 15: Two Rooms
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 2 }, 
    goalPos: { x: 4, y: 2 }, 
    obstacles: [
      {x:2,y:0}, {x:2,y:1}, {x:2,y:3}, {x:2,y:4}, // Wall with gap at y=2
      {x:3,y:1}, {x:3,y:3} // Little buffers
    ] 
  },

  // --- STAGE 4: ADVANCED ---

  // Level 16: Scatter
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 4, y: 4 }, 
    obstacles: [{x:1,y:1}, {x:2,y:2}, {x:3,y:3}, {x:4,y:3}, {x:3,y:4}] 
  },
  
  // Level 17: Long Walk
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 4 }, 
    goalPos: { x: 0, y: 3 }, 
    obstacles: [
      {x:1,y:4}, {x:1,y:3}, {x:1,y:2}, 
      {x:2,y:1}, {x:3,y:1}, {x:4,y:1}, // Top bar
      {x:3,y:3}, {x:2,y:3} 
    ] 
  },

  // Level 18: The Fortress
  {
    gridSize: 5,
    playerPos: { x: 0, y: 4 },
    goalPos: { x: 3, y: 2 }, // Goal inside
    obstacles: [
       {x:2,y:1}, {x:3,y:1}, {x:4,y:1},
       {x:2,y:2},            {x:4,y:2},
       {x:2,y:3},            {x:4,y:3} 
       // Gap at (3,3)
    ]
  },

  // Level 19: Maze Runner
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 4, y: 4 }, 
    obstacles: [
      {x:1,y:0}, {x:1,y:2}, 
      {x:3,y:1}, {x:3,y:3}, 
      {x:2,y:2}, {x:0,y:2}
    ] 
  },

  // Level 20: The Bridge
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 2 }, 
    goalPos: { x: 4, y: 2 }, 
    obstacles: [
      {x:1,y:1}, {x:2,y:1}, {x:3,y:1}, 
      {x:1,y:3}, {x:2,y:3}, {x:3,y:3},
      {x:2,y:0}, {x:2,y:4} // Distractions
    ] 
  }, 

  // --- STAGE 5: EXPERT ---

  // Level 21: Vertical Stripes
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 2 }, 
    goalPos: { x: 4, y: 2 }, 
    obstacles: [
      {x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:1,y:4}, // Gap at y=3
      {x:3,y:0}, {x:3,y:2}, {x:3,y:3}, {x:3,y:4}, // Gap at y=1
    ] 
  },

  // Level 22: Winding Road
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 4, y: 4 }, 
    obstacles: [
      {x:1,y:0}, {x:1,y:1}, {x:1,y:2}, 
      {x:3,y:4}, {x:3,y:3}, {x:3,y:2},
    ] 
  },

  // Level 23: Center Guard
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 2, y: 2 }, 
    obstacles: [
      {x:1,y:1}, {x:3,y:1},
      {x:1,y:2}, {x:3,y:2}, 
      {x:1,y:3}, {x:2,y:3}, {x:3,y:3}
    ]
  },

  // Level 24: Hooks
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 2 }, 
    goalPos: { x: 4, y: 2 }, 
    obstacles: [
      {x:1,y:1}, {x:1,y:2}, {x:1,y:3}, // C
      {x:3,y:0}, {x:3,y:1}, {x:3,y:2}, // Hook down
    ] 
  },

  // Level 25: Checkers
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 4, y: 4 }, 
    obstacles: [
      {x:1,y:0}, {x:3,y:0},
      {x:0,y:2}, {x:2,y:2}, {x:4,y:2},
      {x:1,y:4}, {x:3,y:4}
    ] 
  },
  
  // Level 26: The Hurdles
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 4 }, 
    goalPos: { x: 4, y: 4 }, 
    obstacles: [
      {x:1,y:4}, 
      {x:1,y:3}, 
      {x:2,y:4}, 
      {x:3,y:3}, 
      {x:3,y:4} 
    ] 
  },

  // Level 27: Around the Edge
  { 
    gridSize: 5, 
    playerPos: { x: 2, y: 2 }, 
    goalPos: { x: 2, y: 1 }, 
    obstacles: [
      {x:2,y:3}, // Block down
      {x:1,y:2}, {x:3,y:2}, // Block sides
      // Force Up -> Left -> Down -> Right -> Up
      // Or Up -> Right -> Down -> Left -> Up
      // Actually goal is (2,1). Start (2,2). 
      // If (2,1) is open, it's 1 step up. Too easy.
      // Let's put obstacle at (2,1).
      {x:2,y:1}, 
      // Now path must go around.
      {x:1,y:1}, {x:3,y:1} // Block diagonals
    ] 
  },

  // Level 28: Final Maze 1
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 4, y: 4 }, 
    obstacles: [
      {x:0,y:1}, {x:1,y:1}, {x:2,y:1}, {x:3,y:1},
      {x:3,y:3}, {x:2,y:3}, {x:1,y:3}, {x:0,y:3},
      {x:4,y:2} // Block simple drop
    ] 
  },

  // Level 29: Final Maze 2
  { 
    gridSize: 5, 
    playerPos: { x: 4, y: 0 }, 
    goalPos: { x: 0, y: 4 }, 
    obstacles: [
      {x:3,y:0}, {x:3,y:1}, {x:3,y:2}, 
      {x:1,y:4}, {x:1,y:3}, {x:1,y:2}, 
      {x:0,y:2}, {x:4,y:2}
    ] 
  },

  // Level 30: Graduation (Grand Spiral 5x5)
  { 
    gridSize: 5, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 2, y: 2 }, 
    obstacles: [
       {x:0,y:1}, // Block down
       {x:1,y:1}, {x:2,y:1}, {x:3,y:1}, // Force top row
       {x:3,y:2}, {x:3,y:3}, // Force right side down
       {x:2,y:3}, {x:1,y:3}, // Force bottom
       // Now at (0,3) -> (0,2) -> (1,2) -> (2,2)
    ]
  }
];

const encouragingPhrases = [
  "真棒！", "好聪明！", "哇，太厉害了！", 
  "做得好！", "完美的程序！", "你是天才！", 
  "闪闪发光！", "继续加油！"
];

const tryAgainPhrases = [
  "没关系，再试一次！", "哎呀，撞到了！", "加油，你可以的！", 
  "稍微改一下就好啦！", "别灰心，再来！"
];

const getRandomPhrase = (list: string[]) => list[Math.floor(Math.random() * list.length)];

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>(LEVELS[0]);
  const [program, setProgram] = useState<Direction[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [rewardImage, setRewardImage] = useState<string | null>(null);
  const [loadingReward, setLoadingReward] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  
  // Track highest unlocked level (0-based index)
  const [unlockedLevel, setUnlockedLevel] = useState(0);

  // Initialize state when level changes
  useEffect(() => {
    setGameState(LEVELS[levelIndex]);
    setProgram([]);
    setShowWinModal(false);
  }, [levelIndex]);

  // --- Story / Teacher Logic ---

  const handleStartStory = async () => {
    unlockAudioContext(); // Important for iOS Safari
    playClickSound();
    setCurrentScreen(Screen.STORY);
    // Ask for explanation of "computer program" in Chinese
    const text = await generateFriendlyExplanation("计算机程序");
    setExplanation(text);
    speakText(text);
  };

  const handleSpeak = () => {
    playClickSound();
    if (explanation) speakText(explanation);
  };

  // --- Game Logic ---

  const addToProgram = (dir: Direction) => {
    if (isPlaying) return;
    
    // Voice Feedback
    let word = "";
    switch(dir) {
      case Direction.UP: word = "上"; break;
      case Direction.DOWN: word = "下"; break;
      case Direction.LEFT: word = "左"; break;
      case Direction.RIGHT: word = "右"; break;
    }
    speakText(word);
    
    setProgram(prev => [...prev, dir]);
  };

  const clearProgram = () => {
    if (isPlaying) return;
    playDeleteSound();
    setProgram([]);
    setGameState(prev => ({ ...prev, playerPos: LEVELS[levelIndex].playerPos }));
  };

  const runProgram = useCallback(async () => {
    if (program.length === 0) {
      speakText("你需要先加一些箭头！");
      return;
    }

    playClickSound(); // Sound for clicking run
    setIsPlaying(true);
    let currentPos = { ...gameState.playerPos };
    let failed = false;

    for (const step of program) {
      // Step sound and delay
      playStepSound();
      // Ensure we pass a closure to setTimeout to be 100% CSP safe regarding execution
      await new Promise(resolve => setTimeout(() => resolve(undefined), 600)); 

      let nextPos = { ...currentPos };
      if (step === Direction.UP) nextPos.y = Math.max(0, currentPos.y - 1);
      if (step === Direction.DOWN) nextPos.y = Math.min(gameState.gridSize - 1, currentPos.y + 1);
      if (step === Direction.LEFT) nextPos.x = Math.max(0, currentPos.x - 1);
      if (step === Direction.RIGHT) nextPos.x = Math.min(gameState.gridSize - 1, currentPos.x + 1);

      // Check collision with obstacles
      const hitObstacle = gameState.obstacles.some(obs => obs.x === nextPos.x && obs.y === nextPos.y);
      if (!hitObstacle) {
        currentPos = nextPos;
        setGameState(prev => ({ ...prev, playerPos: nextPos }));
      } else {
         playBonkSound();
         speakText(getRandomPhrase(tryAgainPhrases));
         failed = true;
         break; // Stop execution on crash
      }
    }

    setIsPlaying(false);

    if (failed) {
        setTimeout(() => {
            setGameState(prev => ({...prev, playerPos: LEVELS[levelIndex].playerPos}));
        }, 1000);
        return;
    }

    // Check Win
    if (currentPos.x === gameState.goalPos.x && currentPos.y === gameState.goalPos.y) {
       handleWin();
    } else {
       speakText("差点就到了！再试一次。");
       // Reset position after a short delay so they can try again
       setTimeout(() => {
          setGameState(prev => ({...prev, playerPos: LEVELS[levelIndex].playerPos}));
       }, 1500);
    }
  }, [program, gameState.gridSize, gameState.obstacles, gameState.goalPos, levelIndex]);

  const handleWin = async () => {
    // Unlock next level if we beat the current max
    if (levelIndex >= unlockedLevel && levelIndex < LEVELS.length - 1) {
        setUnlockedLevel(levelIndex + 1);
    }

    if (levelIndex < LEVELS.length - 1) {
      playWinSound();
      setShowWinModal(true); // Show animation
      const encouragement = getRandomPhrase(encouragingPhrases);
      setTimeout(() => speakText(encouragement), 200);
    } else {
      playVictorySound();
      speakText("哇！不可思议！你通关了所有30个关卡！你是超级程序员！");
      setCurrentScreen(Screen.REWARD);
      setLoadingReward(true);
      const prompt = "A super happy chinese new year style dragon and a cute girl coding together, festive and magical, confetti";
      const img = await generateRewardSticker(prompt);
      setRewardImage(img);
      setLoadingReward(false);
    }
  };

  const nextLevel = () => {
    playClickSound();
    setShowWinModal(false);
    setLevelIndex(prev => prev + 1);
  };

  // --- Render Helpers ---

  const renderHome = () => (
    <div 
      className="flex flex-col items-center justify-center p-6 text-center space-y-8 bg-gradient-to-b from-pink-100 to-purple-200 relative"
      style={{ minHeight: '100dvh' }}
    >
      <div 
        className="bg-white p-6 shadow-xl"
        style={{ borderRadius: '2rem' }}
      >
        <BotIcon className="w-24 h-24 text-purple-500 mx-auto mb-4 animate-bounce-gentle" />
        <h1 className="text-4xl md:text-6xl font-black text-purple-600 mb-2">闪闪编程</h1>
        <p className="text-xl text-gray-500">学习和电脑说话！</p>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={handleStartStory}
            className="bg-pink-500 hover:bg-pink-400 text-white text-2xl font-bold py-6 px-12 rounded-full transition-all flex items-center justify-center gap-3"
            style={{ boxShadow: '0 8px 0 rgb(190,24,93)' }}
          >
            <Play fill="currentColor" /> 开始故事
          </button>

          <button 
            onClick={() => {
              playClickSound();
              unlockAudioContext(); // Important for iOS Safari
              setCurrentScreen(Screen.LEVEL_SELECT);
            }}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-xl font-bold py-4 px-12 rounded-full transition-all flex items-center justify-center gap-3"
            style={{ boxShadow: '0 6px 0 rgb(202,138,4)' }}
          >
            <LayoutGrid size={24} /> 选择关卡
          </button>
      </div>

      <div className="absolute bottom-4 opacity-40 hover:opacity-100 transition-opacity">
        <a 
          href="https://github.com/tlqtangok/littleChildGame" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 text-gray-600 text-xs font-medium"
        >
          <Github size={14} />
          tlqtangok/littleChildGame
        </a>
      </div>
    </div>
  );

  const renderStory = () => (
    <div 
      className="flex flex-col items-center justify-center p-6 bg-yellow-50"
      style={{ minHeight: '100dvh' }}
    >
      <div 
        className="max-w-2xl bg-white p-8 border-8 border-yellow-200 relative"
        style={{ borderRadius: '3rem' }}
      >
        <button 
           onClick={() => {
             playClickSound();
             setCurrentScreen(Screen.HOME);
           }} 
           className="absolute top-4 left-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"
        >
          <Home size={24} />
        </button>
        <button 
           onClick={handleSpeak} 
           className="absolute top-4 right-4 bg-yellow-100 p-3 rounded-full text-yellow-600 hover:bg-yellow-200"
        >
          <Volume2 size={32} />
        </button>
        <h2 className="text-3xl font-bold text-purple-600 mb-6 text-center mt-8 md:mt-0">什么是程序？</h2>
        <div 
          className="text-xl md:text-2xl text-gray-600 leading-relaxed text-center mb-8 flex items-center justify-center"
          style={{ minHeight: '120px' }}
        >
          {explanation ? explanation : (
            <div className="animate-pulse flex flex-col items-center">
                <Sparkles className="animate-spin mb-2 text-yellow-400" />
                正在问魔法机器人... ✨
            </div>
          )}
        </div>
        <div className="flex justify-center">
             <button 
              onClick={() => {
                playClickSound();
                setLevelIndex(0);
                setCurrentScreen(Screen.GAME);
                speakText("让我们写一个程序来拿到奖杯！");
              }}
              className="bg-purple-500 hover:bg-purple-400 text-white text-xl font-bold py-4 px-10 rounded-full transition-all flex items-center gap-2"
              style={{ boxShadow: '0 6px 0 rgb(107,33,168)' }}
            >
              <Play size={24} fill="currentColor" /> 试一试！
            </button>
        </div>
      </div>
    </div>
  );

  const renderLevelSelect = () => (
    <div 
      className="bg-blue-50 flex flex-col items-center p-6 pb-20"
      style={{ minHeight: '100dvh' }}
    >
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
         <button 
           onClick={() => {
             playClickSound();
             setCurrentScreen(Screen.HOME);
           }}
           className="bg-white p-3 rounded-xl shadow-md text-blue-500 font-bold hover:bg-blue-50 flex items-center gap-2"
         >
           <Home size={24} /> 主页
         </button>
         <h2 className="text-3xl font-black text-blue-600">选择关卡</h2>
         <div className="w-24"></div> 
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full max-w-4xl">
         {LEVELS.map((_, index) => {
           const isCompleted = index <= unlockedLevel; 
           const isCurrent = index === levelIndex;

           return (
             <button
               key={index}
               onClick={() => {
                  playClickSound();
                  setLevelIndex(index);
                  setCurrentScreen(Screen.GAME);
                  setProgram([]);
               }}
               className={`
                 aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 text-xl font-bold transition-all active:translate-y-2 active:shadow-none
                 ${isCurrent ? 'ring-4 ring-pink-400 bg-purple-50' : 'bg-white hover:bg-purple-50'}
                 text-purple-600
               `}
               style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.1)' }}
             >
               <span className="text-3xl">{index + 1}</span>
               {isCompleted && index < unlockedLevel ? (
                 <div className="flex gap-1">
                   {[...Array(Math.min(3, Math.ceil(((index + 1) / 30) * 3)))].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xs">★</span>
                   ))}
                 </div>
               ) : (
                  <span className="text-sm opacity-50 text-pink-200">♥</span>
               )}
             </button>
           );
         })}
      </div>
    </div>
  );

  const renderGame = () => (
    <div 
      className="bg-blue-50 flex flex-col items-center p-4 relative min-h-screen overflow-x-hidden"
    >
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4 mt-2">
        <button onClick={() => {
          playClickSound();
          setCurrentScreen(Screen.LEVEL_SELECT);
        }} className="text-blue-500 font-bold hover:text-blue-700 bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
           <LayoutGrid size={20} /> 关卡
        </button>
        <h2 className="text-2xl font-bold text-blue-600">
          第 {levelIndex + 1} 关
        </h2>
        <button onClick={() => {
           playClickSound();
           setCurrentScreen(Screen.HOME);
        }} className="text-blue-400 hover:text-blue-600">
           <Home size={24} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start w-full max-w-6xl justify-center z-10 px-0 md:px-4">
        
        {/* The Grid Container - Responsive */}
        <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl flex-shrink-0 flex justify-center">
           <GameGrid gameState={gameState} />
        </div>

        {/* Controls Container - Takes remaining space */}
        <div 
          className="w-full max-w-lg lg:max-w-full lg:flex-1 bg-white p-4 md:p-6 shadow-xl border-4 border-blue-100 rounded-3xl"
        >
          <div className="mb-6">
             <div className="flex justify-between items-end mb-2">
                <h3 className="text-xl font-bold text-gray-500">我的程序：</h3>
                <span className="text-sm text-gray-400">{program.length} 步</span>
             </div>
             
             <div 
               className="bg-gray-100 rounded-2xl p-4 flex flex-wrap gap-2 items-center"
               style={{ minHeight: '80px' }}
             >
                {program.length === 0 && <span className="text-gray-400 italic">点击箭头添加步骤...</span>}
                {program.map((step, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 text-purple-500 animate-bounce-gentle" style={{ animationDelay: `${idx * 0.1}s` }}>
                     {step === Direction.UP && <ArrowUp size={20} />}
                     {step === Direction.DOWN && <ArrowDown size={20} />}
                     {step === Direction.LEFT && <ArrowLeft size={20} />}
                     {step === Direction.RIGHT && <ArrowRight size={20} />}
                  </div>
                ))}
             </div>
          </div>

          <div 
            className="grid grid-cols-3 gap-4 mb-8 mx-auto"
            style={{ maxWidth: '300px' }}
          >
             <div />
             <GameButton onClick={() => addToProgram(Direction.UP)} icon={<ArrowUp size={32} />} color="bg-yellow-400" />
             <div />
             <GameButton onClick={() => addToProgram(Direction.LEFT)} icon={<ArrowLeft size={32} />} color="bg-yellow-400" />
             <div />
             <GameButton onClick={() => addToProgram(Direction.RIGHT)} icon={<ArrowRight size={32} />} color="bg-yellow-400" />
             <div />
             <GameButton onClick={() => addToProgram(Direction.DOWN)} icon={<ArrowDown size={32} />} color="bg-yellow-400" />
             <div />
          </div>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={clearProgram}
              className="bg-red-100 hover:bg-red-200 text-red-500 p-4 rounded-2xl transition-colors"
              disabled={isPlaying}
              aria-label="重置"
            >
              <RotateCcw size={28} />
            </button>
            <button 
              onClick={runProgram}
              disabled={isPlaying}
              className={`
                flex-1 bg-green-500 hover:bg-green-400 text-white text-xl font-bold py-4 px-8 rounded-2xl 
                active:translate-y-2 active:shadow-none transition-all
                flex items-center justify-center gap-2
                ${isPlaying ? 'opacity-50 cursor-not-allowed shadow-none translate-y-2' : ''}
              `}
              style={!isPlaying ? { boxShadow: '0 6px 0 rgb(21,128,61)' } : {}}
            >
              <Play fill="currentColor" /> 运行程序！
            </button>
          </div>
        </div>
      </div>

      {/* WIN MODAL OVERLAY */}
      {showWinModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm flex flex-col items-center animate-pop-in border-8 border-yellow-300 shadow-2xl relative overflow-hidden">
            {/* Confetti Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-10 left-10 text-pink-500 animate-spin"><Star size={20} /></div>
                <div className="absolute top-10 right-20 text-blue-500 animate-bounce"><Star size={30} /></div>
                <div className="absolute bottom-20 left-1/2 text-yellow-500 animate-pulse"><Star size={40} /></div>
            </div>

            <div className="bg-yellow-100 p-6 rounded-full mb-4">
              <Trophy className="w-16 h-16 text-yellow-500 animate-bounce" />
            </div>
            
            <h2 className="text-4xl font-black text-purple-600 mb-2">太棒了！</h2>
            <p className="text-gray-500 mb-8 text-center text-lg">你完成了第 {levelIndex + 1} 关！</p>
            
            <button 
              onClick={nextLevel}
              className="bg-green-500 hover:bg-green-400 text-white text-2xl font-bold py-4 px-12 rounded-full shadow-lg active:scale-95 transition-transform flex items-center gap-2"
            >
               下一关 <ArrowRight />
            </button>
          </div>
        </div>
      )}

    </div>
  );

  const renderReward = () => (
    <div 
      className="flex flex-col items-center justify-center p-6 bg-gradient-to-tr from-purple-400 to-pink-500"
      style={{ minHeight: '100dvh' }}
    >
       <div 
         className="bg-white p-8 shadow-2xl text-center max-w-md w-full animate-bounce-gentle"
         style={{ borderRadius: '3rem' }}
       >
          <h2 className="text-4xl font-black text-pink-500 mb-2">太棒了！</h2>
          <p className="text-gray-500 text-lg mb-6">你完成了所有30个关卡！</p>
          
          <div className="w-full aspect-square bg-gray-50 rounded-3xl mb-8 flex items-center justify-center overflow-hidden border-4 border-pink-100">
             {loadingReward ? (
               <div className="text-center">
                 <Sparkles className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-2" />
                 <p className="text-gray-400 font-medium">正在制作你的奖状...</p>
               </div>
             ) : rewardImage ? (
               <img src={rewardImage} alt="Reward Sticker" className="w-full h-full object-cover" />
             ) : (
               <Trophy className="w-24 h-24 text-yellow-400" />
             )}
          </div>

          <button 
            onClick={() => {
              playClickSound();
              setLevelIndex(0);
              setProgram([]);
              setRewardImage(null);
              setCurrentScreen(Screen.HOME);
            }}
            className="w-full bg-purple-500 hover:bg-purple-400 text-white text-xl font-bold py-4 rounded-2xl active:translate-y-2 active:shadow-none transition-all"
            style={{ boxShadow: '0 6px 0 rgb(126,34,206)' }}
          >
            再玩一次
          </button>
       </div>
    </div>
  );

  return (
    <>
      {currentScreen === Screen.HOME && renderHome()}
      {currentScreen === Screen.STORY && renderStory()}
      {currentScreen === Screen.LEVEL_SELECT && renderLevelSelect()}
      {currentScreen === Screen.GAME && renderGame()}
      {currentScreen === Screen.REWARD && renderReward()}
    </>
  );
};

// Subcomponent for buttons
const GameButton = ({ onClick, icon, color }: { onClick: () => void; icon: React.ReactNode; color: string }) => (
  <button 
    onClick={onClick}
    className={`${color} text-white p-4 rounded-2xl active:translate-y-2 active:shadow-none transition-all flex items-center justify-center`}
    style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.2)' }}
  >
    {icon}
  </button>
);

// Simple SVG Bot Icon
const BotIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5m9 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5" />
  </svg>
);

export default App;
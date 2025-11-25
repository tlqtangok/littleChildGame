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
  Github
} from 'lucide-react';

// --- Level Definitions (30 Levels Sorted by Difficulty) ---

const LEVELS: GameState[] = [
  // --- STAGE 1: VERY EASY (4x4 Grid, Short Paths) ---
  
  // Level 1: Just go right (Introduction)
  { gridSize: 4, playerPos: { x: 0, y: 1 }, goalPos: { x: 3, y: 1 }, obstacles: [] },
  
  // Level 2: Just go down
  { gridSize: 4, playerPos: { x: 1, y: 0 }, goalPos: { x: 1, y: 3 }, obstacles: [{ x: 0, y: 1 }, { x: 2, y: 2 }] },
  
  // Level 3: One simple turn (L-shape)
  { gridSize: 4, playerPos: { x: 0, y: 0 }, goalPos: { x: 2, y: 2 }, obstacles: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
  
  // Level 4: Simple Dodge (Up and Over)
  { gridSize: 4, playerPos: { x: 0, y: 2 }, goalPos: { x: 3, y: 2 }, obstacles: [{ x: 1, y: 2 }, { x: 1, y: 3 }] },
  
  // Level 5: The "Stairs" (Right, Down, Right, Down)
  { gridSize: 4, playerPos: { x: 0, y: 0 }, goalPos: { x: 2, y: 2 }, obstacles: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 }] },

  // --- STAGE 2: EASY (5x5 Grid, More Space) ---

  // Level 6: Long Straight Walk (Introduction to 5x5)
  { gridSize: 5, playerPos: { x: 0, y: 2 }, goalPos: { x: 4, y: 2 }, obstacles: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }] },
  
  // Level 7: Go Around the Block
  { gridSize: 5, playerPos: { x: 2, y: 0 }, goalPos: { x: 2, y: 4 }, obstacles: [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 }] },
  
  // Level 8: The Tunnel (Straight but constrained)
  { gridSize: 5, playerPos: { x: 0, y: 2 }, goalPos: { x: 4, y: 2 }, obstacles: [{x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:1,y:3}, {x:2,y:3}, {x:3,y:3}] },
  
  // Level 9: Big U-Turn (Down, Right, Up)
  { gridSize: 5, playerPos: { x: 0, y: 0 }, goalPos: { x: 4, y: 0 }, obstacles: [{x:1,y:0}, {x:2,y:0}, {x:3,y:0}, {x:1,y:2}, {x:2,y:2}, {x:3,y:2}] },
  
  // Level 10: Simple Zig Zag
  { gridSize: 5, playerPos: { x: 1, y: 0 }, goalPos: { x: 3, y: 4 }, obstacles: [{x:2,y:0}, {x:2,y:1}, {x:2,y:3}, {x:2,y:4}] },

  // --- STAGE 3: MEDIUM (Complex Turns) ---

  // Level 11: Pillars (Weave through)
  { gridSize: 5, playerPos: { x: 0, y: 2 }, goalPos: { x: 4, y: 2 }, obstacles: [{x:1,y:1}, {x:1,y:3}, {x:3,y:1}, {x:3,y:3}] },
  
  // Level 12: The Snake (Winding Path)
  { gridSize: 5, playerPos: { x: 0, y: 0 }, goalPos: { x: 4, y: 0 }, obstacles: [{x:1,y:0}, {x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:3,y:0}] },
  
  // Level 13: Two Walls (Go Up and Down)
  { gridSize: 5, playerPos: { x: 0, y: 0 }, goalPos: { x: 4, y: 0 }, obstacles: [{x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:3,y:4}, {x:3,y:3}, {x:3,y:2}] },
  
  // Level 14: Zig Zag Up
  { gridSize: 5, playerPos: { x: 2, y: 4 }, goalPos: { x: 2, y: 0 }, obstacles: [{x:2,y:3}, {x:1,y:3}, {x:1,y:2}, {x:3,y:2}, {x:3,y:1}, {x:2,y:1}] },
  
  // Level 15: Corner to Corner
  { gridSize: 5, playerPos: { x: 0, y: 4 }, goalPos: { x: 4, y: 0 }, obstacles: [{x:0,y:3}, {x:1,y:3}, {x:2,y:3}, {x:2,y:2}, {x:2,y:1}, {x:3,y:1}] },

  // --- STAGE 4: HARD (Longer Paths) ---

  // Level 16: The Maze Begins
  { gridSize: 5, playerPos: { x: 2, y: 2 }, goalPos: { x: 4, y: 4 }, obstacles: [{x:3,y:3}, {x:3,y:2}, {x:2,y:3}, {x:1,y:2}, {x:2,y:1}] },
  
  // Level 17: Escape the Box
  { gridSize: 5, playerPos: { x: 2, y: 2 }, goalPos: { x: 0, y: 0 }, obstacles: [{x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:3,y:2}, {x:3,y:3}, {x:2,y:3}, {x:1,y:3}] }, 
  
  // Level 18: Wide 6x6 Diagonal
  { gridSize: 6, playerPos: { x: 0, y: 0 }, goalPos: { x: 5, y: 5 }, obstacles: [{x:1,y:0}, {x:2,y:1}, {x:3,y:2}, {x:4,y:3}, {x:5,y:4}] },
  
  // Level 19: Long Way Around (6x6)
  { gridSize: 6, playerPos: { x: 0, y: 0 }, goalPos: { x: 0, y: 1 }, obstacles: [{x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:1,y:3}, {x:1,y:4}, {x:1,y:5}, {x:3,y:0}, {x:3,y:1}, {x:3,y:2}, {x:3,y:3}, {x:3,y:4}, {x:3,y:5}, {x:5,y:0}, {x:5,y:1}] },
  
  // Level 20: Divide (Choose your path)
  { gridSize: 6, playerPos: { x: 2, y: 5 }, goalPos: { x: 3, y: 0 }, obstacles: [{x:2,y:4}, {x:3,y:4}, {x:2,y:3}, {x:3,y:3}, {x:2,y:2}, {x:3,y:2}] },

  // --- STAGE 5: EXPERT (6x6 Complex) ---

  // Level 21: Scatter
  { gridSize: 6, playerPos: { x: 0, y: 2 }, goalPos: { x: 5, y: 3 }, obstacles: [{x:2,y:2}, {x:3,y:3}, {x:2,y:3}, {x:3,y:2}] },
  
  // Level 22: Tight Spin (6x6)
  { gridSize: 6, playerPos: { x: 2, y: 3 }, goalPos: { x: 3, y: 2 }, obstacles: [{x:2,y:2}, {x:3,y:3}, {x:1,y:3}, {x:4,y:2}, {x:2,y:4}, {x:3,y:1}] },
  
  // Level 23: The Big Snake
  { gridSize: 6, playerPos: { x: 0, y: 5 }, goalPos: { x: 5, y: 0 }, obstacles: [{x:1,y:5}, {x:1,y:4}, {x:1,y:3}, {x:3,y:3}, {x:3,y:2}, {x:3,y:1}, {x:5,y:1}] },
  
  // Level 24: Spiral In
  { gridSize: 6, playerPos: { x: 0, y: 0 }, goalPos: { x: 3, y: 3 }, obstacles: [{x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:4,y:1}, {x:4,y:2}, {x:4,y:3}, {x:4,y:4}, {x:2,y:3}] },
  
  // Level 25: Corner Maze
  { gridSize: 6, playerPos: { x: 5, y: 5 }, goalPos: { x: 0, y: 0 }, obstacles: [{x:4,y:4}, {x:5,y:4}, {x:2,y:2}, {x:3,y:2}, {x:2,y:3}, {x:3,y:3}, {x:0,y:1}, {x:1,y:1}, {x:1,y:0}] },
  
  // Level 26: Stripes
  { gridSize: 6, playerPos: { x: 0, y: 0 }, goalPos: { x: 5, y: 5 }, obstacles: [{x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:1,y:3}, {x:1,y:4}, {x:3,y:5}, {x:3,y:4}, {x:3,y:3}, {x:3,y:2}, {x:3,y:1}] },
  
  // Level 27: The Hurdles (Fixed: Removed impossible barrier at 4,4)
  { gridSize: 6, playerPos: { x: 0, y: 5 }, goalPos: { x: 5, y: 5 }, obstacles: [{x:1,y:5}, {x:2,y:4}, {x:3,y:5}, {x:5,y:3}, {x:5,y:4}] },
  
  // Level 28: Around the World
  { gridSize: 6, playerPos: { x: 2, y: 2 }, goalPos: { x: 3, y: 3 }, obstacles: [{x:2,y:3}, {x:3,y:2}, {x:1,y:1}, {x:4,y:4}, {x:1,y:4}, {x:4,y:1}] },

  // Level 29: Final Test A
  { gridSize: 6, playerPos: { x: 0, y: 0 }, goalPos: { x: 5, y: 0 }, obstacles: [{x:1,y:0}, {x:1,y:1}, {x:1,y:2}, {x:3,y:5}, {x:3,y:4}, {x:3,y:3}, {x:5,y:2}, {x:5,y:1}] },

  // Level 30: The Grand Spiral (Redesigned & Verified)
  { 
    gridSize: 6, 
    playerPos: { x: 0, y: 0 }, 
    goalPos: { x: 3, y: 3 }, 
    obstacles: [
      // Force Top Row (0,0 -> 5,0)
      {x:0,y:1}, {x:1,y:1}, {x:2,y:1}, {x:3,y:1}, {x:4,y:1},
      // Force Right Col (5,0 -> 5,5)
      {x:4,y:2}, {x:4,y:3}, {x:4,y:4},
      // Force Bottom Row (5,5 -> 0,5)
      {x:1,y:4}, {x:2,y:4}, {x:3,y:4},
      // Force Left Up (0,5 -> 0,2) then In
      {x:1,y:3}, {x:2,y:3}
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
  
  // Track highest unlocked level (0-based index)
  const [unlockedLevel, setUnlockedLevel] = useState(0);

  // Initialize state when level changes
  useEffect(() => {
    setGameState(LEVELS[levelIndex]);
    setProgram([]);
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
    playClickSound();
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
      const encouragement = getRandomPhrase(encouragingPhrases);
      // Wait slightly for the win sound to sparkle before speaking
      setTimeout(() => speakText(encouragement + " 下一关！"), 500);
      
      setTimeout(() => {
        setLevelIndex(prev => prev + 1);
      }, 2500);
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-4xl">
         {LEVELS.map((_, index) => {
           // Allow playing any level freely (requested by user previously), or use index <= unlockedLevel
           const isUnlocked = true; 
           
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
                 ${index === levelIndex ? 'ring-4 ring-pink-400' : ''}
                 ${isUnlocked 
                    ? 'bg-white text-purple-600 hover:bg-purple-50' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
               `}
               style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.1)' }}
               disabled={!isUnlocked}
             >
               <span className="text-3xl">{index + 1}</span>
               {isUnlocked ? (
                 <div className="flex gap-1">
                   {[...Array(Math.min(3, Math.ceil(((index + 1) / 30) * 3)))].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xs">★</span>
                   ))}
                 </div>
               ) : (
                  <span className="text-sm">🔒</span>
               )}
             </button>
           );
         })}
      </div>
    </div>
  );

  const renderGame = () => (
    <div 
      className="bg-blue-50 flex flex-col items-center p-4"
      style={{ minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 mt-4">
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

      <div className="flex flex-col md:flex-row gap-8 items-start w-full max-w-5xl justify-center">
        
        {/* The Grid */}
        <div className="flex-1 w-full flex justify-center">
           <GameGrid gameState={gameState} />
        </div>

        {/* Controls */}
        <div 
          className="flex-1 w-full bg-white p-6 shadow-xl border-4 border-blue-100"
          style={{ borderRadius: '2rem' }}
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
             <GameButton onClick={() => addToProgram(Direction.UP)} icon={<ArrowUp size={32} />} color="bg-orange-400" />
             <div />
             <GameButton onClick={() => addToProgram(Direction.LEFT)} icon={<ArrowLeft size={32} />} color="bg-orange-400" />
             <div />
             <GameButton onClick={() => addToProgram(Direction.RIGHT)} icon={<ArrowRight size={32} />} color="bg-orange-400" />
             <div />
             <GameButton onClick={() => addToProgram(Direction.DOWN)} icon={<ArrowDown size={32} />} color="bg-orange-400" />
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
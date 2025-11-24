import React, { useState, useEffect, useCallback } from 'react';
import { Screen, GameState, Direction, Position } from './types';
import { generateFriendlyExplanation, speakText, generateRewardSticker } from './services/geminiService';
import { unlockAudioContext } from './services/audioUtils';
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
  Home
} from 'lucide-react';

// --- Level Definitions (Fixed & Verified) ---

const LEVELS: GameState[] = [
  // Level 1: 直走 (Simple Right)
  {
    gridSize: 4,
    playerPos: { x: 0, y: 1 },
    goalPos: { x: 3, y: 1 },
    obstacles: [],
  },
  // Level 2: 转个弯 (Down and Right) - Fixed: Removed blocking obstacle
  {
    gridSize: 4,
    playerPos: { x: 0, y: 0 },
    goalPos: { x: 2, y: 2 },
    obstacles: [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 2 }],
  },
  // Level 3: 绕过石头 (Avoid the rock)
  {
    gridSize: 4,
    playerPos: { x: 0, y: 2 },
    goalPos: { x: 3, y: 2 },
    obstacles: [{ x: 1, y: 2 }],
  },
  // Level 4: 爬楼梯 (Stairs)
  {
    gridSize: 4,
    playerPos: { x: 0, y: 3 },
    goalPos: { x: 3, y: 0 },
    obstacles: [
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    ],
  },
  // Level 5: U型弯 (The U-Turn)
  {
    gridSize: 4,
    playerPos: { x: 0, y: 0 },
    goalPos: { x: 0, y: 2 },
    obstacles: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  },
  // Level 6: 穿过森林 (Through the forest) - 5x5 Start
  {
    gridSize: 5,
    playerPos: { x: 2, y: 0 },
    goalPos: { x: 2, y: 4 },
    obstacles: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 4 }, { x: 4, y: 4 }],
  },
  // Level 7: 螺旋 (Spiral)
  {
    gridSize: 5,
    playerPos: { x: 0, y: 0 },
    goalPos: { x: 2, y: 2 },
    obstacles: [
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
      { x: 0, y: 3 }, { x: 0, y: 2 },
      { x: 2, y: 1 } // Inner block
    ],
  },
  // Level 8: 双房间 (Two Rooms)
  {
    gridSize: 5,
    playerPos: { x: 0, y: 2 },
    goalPos: { x: 4, y: 2 },
    obstacles: [
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 3 }, { x: 2, y: 4 }
      // Gap at 2,2
    ],
  },
  // Level 9: 迷宫 (The Maze)
  {
    gridSize: 5,
    playerPos: { x: 0, y: 0 },
    goalPos: { x: 4, y: 4 },
    obstacles: [
      { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
      { x: 1, y: 3 }, { x: 1, y: 4 }
    ],
  },
  // Level 10: 终极大挑战 (Grand Finale)
  {
    gridSize: 5,
    playerPos: { x: 0, y: 0 },
    goalPos: { x: 4, y: 0 },
    obstacles: [
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }
    ],
  },
];

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
    setCurrentScreen(Screen.STORY);
    // Ask for explanation of "computer program" in Chinese
    const text = await generateFriendlyExplanation("计算机程序");
    setExplanation(text);
    speakText(text);
  };

  const handleSpeak = () => {
    if (explanation) speakText(explanation);
  };

  // --- Game Logic ---

  const addToProgram = (dir: Direction) => {
    if (isPlaying) return;
    setProgram(prev => [...prev, dir]);
    
    // Chinese voice feedback for directions
    const feedback = 
      dir === Direction.UP ? "上" :
      dir === Direction.DOWN ? "下" :
      dir === Direction.LEFT ? "左" : "右";
    speakText(feedback);
  };

  const clearProgram = () => {
    if (isPlaying) return;
    setProgram([]);
    setGameState(prev => ({ ...prev, playerPos: LEVELS[levelIndex].playerPos }));
  };

  const runProgram = useCallback(async () => {
    if (program.length === 0) {
      speakText("你需要先加一些箭头！");
      return;
    }

    setIsPlaying(true);
    let currentPos = { ...gameState.playerPos };
    let failed = false;

    for (const step of program) {
      await new Promise(resolve => setTimeout(resolve, 600)); // Step delay

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
         speakText("哎哟！撞墙了。");
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
      speakText("太棒了！下一关！");
      setTimeout(() => {
        setLevelIndex(prev => prev + 1);
      }, 1500);
    } else {
      speakText("耶！你通关了！你是小小程序员！");
      setCurrentScreen(Screen.REWARD);
      setLoadingReward(true);
      const prompt = "A super happy chinese new year style dragon and a cute girl coding together, festive and magical";
      const img = await generateRewardSticker(prompt);
      setRewardImage(img);
      setLoadingReward(false);
    }
  };

  // --- Render Helpers ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center space-y-8 bg-gradient-to-b from-pink-100 to-purple-200">
      <div className="bg-white p-6 rounded-[2rem] shadow-xl">
        <BotIcon className="w-24 h-24 text-purple-500 mx-auto mb-4 animate-bounce-gentle" />
        <h1 className="text-4xl md:text-6xl font-black text-purple-600 mb-2">闪闪编程</h1>
        <p className="text-xl text-gray-500">学习和电脑说话！</p>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={handleStartStory}
            className="bg-pink-500 hover:bg-pink-400 text-white text-2xl font-bold py-6 px-12 rounded-full shadow-[0_8px_0_rgb(190,24,93)] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3"
          >
            <Play fill="currentColor" /> 开始故事
          </button>

          <button 
            onClick={() => {
              unlockAudioContext(); // Important for iOS Safari
              setCurrentScreen(Screen.LEVEL_SELECT);
            }}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 text-xl font-bold py-4 px-12 rounded-full shadow-[0_6px_0_rgb(202,138,4)] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3"
          >
            <LayoutGrid size={24} /> 选择关卡
          </button>
      </div>
    </div>
  );

  const renderStory = () => (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-yellow-50">
      <div className="max-w-2xl bg-white p-8 rounded-[3rem] shadow-2xl border-8 border-yellow-200 relative">
        <button 
           onClick={() => setCurrentScreen(Screen.HOME)} 
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
        <div className="text-xl md:text-2xl text-gray-600 leading-relaxed text-center mb-8 min-h-[120px] flex items-center justify-center">
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
                setLevelIndex(0);
                setCurrentScreen(Screen.GAME);
                speakText("让我们写一个程序来拿到奖杯！");
              }}
              className="bg-purple-500 hover:bg-purple-400 text-white text-xl font-bold py-4 px-10 rounded-full shadow-[0_6px_0_rgb(107,33,168)] active:translate-y-2 active:shadow-none transition-all flex items-center gap-2"
            >
              <Play size={24} fill="currentColor" /> 试一试！
            </button>
        </div>
      </div>
    </div>
  );

  const renderLevelSelect = () => (
    <div className="min-h-[100dvh] bg-blue-50 flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
         <button 
           onClick={() => setCurrentScreen(Screen.HOME)}
           className="bg-white p-3 rounded-xl shadow-md text-blue-500 font-bold hover:bg-blue-50 flex items-center gap-2"
         >
           <Home size={24} /> 主页
         </button>
         <h2 className="text-3xl font-black text-blue-600">选择关卡</h2>
         <div className="w-24"></div> 
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl">
         {LEVELS.map((_, index) => {
           // Allow playing any level as requested by "freely choose", 
           // but we can visualy highlight unlocked ones if we wanted.
           // User asked to "freely choose", so all are enabled.
           const isUnlocked = true; // index <= unlockedLevel; 
           
           return (
             <button
               key={index}
               onClick={() => {
                 setLevelIndex(index);
                 setCurrentScreen(Screen.GAME);
                 setProgram([]);
               }}
               className={`
                 aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 text-2xl font-bold shadow-[0_6px_0_rgba(0,0,0,0.1)] transition-all active:translate-y-2 active:shadow-none
                 ${index === levelIndex ? 'ring-4 ring-pink-400' : ''}
                 ${isUnlocked 
                    ? 'bg-white text-purple-600 hover:bg-purple-50' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
               `}
               disabled={!isUnlocked}
             >
               <span className="text-4xl">{index + 1}</span>
               {isUnlocked ? (
                 <div className="flex gap-1">
                   {[...Array(Math.min(3, Math.ceil((index + 1) / 3)))].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">★</span>
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
    <div className="min-h-[100dvh] bg-blue-50 flex flex-col items-center p-4">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 mt-4">
        <button onClick={() => {
          setCurrentScreen(Screen.LEVEL_SELECT);
        }} className="text-blue-500 font-bold hover:text-blue-700 bg-white px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
           <LayoutGrid size={20} /> 关卡
        </button>
        <h2 className="text-2xl font-bold text-blue-600">
          第 {levelIndex + 1} 关
        </h2>
        <button onClick={() => {
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
        <div className="flex-1 w-full bg-white p-6 rounded-[2rem] shadow-xl border-4 border-blue-100">
          <div className="mb-6">
             <div className="flex justify-between items-end mb-2">
                <h3 className="text-xl font-bold text-gray-500">我的程序：</h3>
                <span className="text-sm text-gray-400">{program.length} 步</span>
             </div>
             
             <div className="min-h-[80px] bg-gray-100 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
                {program.length === 0 && <span className="text-gray-400 italic">点击箭头添加步骤...</span>}
                {program.map((step, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 text-purple-500">
                     {step === Direction.UP && <ArrowUp size={20} />}
                     {step === Direction.DOWN && <ArrowDown size={20} />}
                     {step === Direction.LEFT && <ArrowLeft size={20} />}
                     {step === Direction.RIGHT && <ArrowRight size={20} />}
                  </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-[300px] mx-auto">
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
                shadow-[0_6px_0_rgb(21,128,61)] active:translate-y-2 active:shadow-none transition-all
                flex items-center justify-center gap-2
                ${isPlaying ? 'opacity-50 cursor-not-allowed shadow-none translate-y-2' : ''}
              `}
            >
              <Play fill="currentColor" /> 运行程序！
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReward = () => (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-to-tr from-purple-400 to-pink-500">
       <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center max-w-md w-full animate-bounce-gentle">
          <h2 className="text-4xl font-black text-pink-500 mb-2">太棒了！</h2>
          <p className="text-gray-500 text-lg mb-6">你完成了所有关卡！</p>
          
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
              setLevelIndex(0);
              setProgram([]);
              setRewardImage(null);
              setCurrentScreen(Screen.HOME);
            }}
            className="w-full bg-purple-500 hover:bg-purple-400 text-white text-xl font-bold py-4 rounded-2xl shadow-[0_6px_0_rgb(126,34,206)] active:translate-y-2 active:shadow-none transition-all"
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
    className={`${color} text-white p-4 rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center`}
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
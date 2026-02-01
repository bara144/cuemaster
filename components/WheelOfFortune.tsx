
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Trophy, RotateCw, X, Lock } from 'lucide-react';
import { AppSettings, PrizeProbability } from '../types';

interface WheelOfFortuneProps {
  t: any;
  isRTL: boolean;
  isDark: boolean;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isAdmin?: boolean;
}

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ t, isRTL, isDark, settings, setSettings, isAdmin = false }) => {
  const [newPrize, setNewPrize] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [pointerAngle, setPointerAngle] = useState(0);
  const [canvasSize, setCanvasSize] = useState(400);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPegRef = useRef<number>(0);

  const COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1'];
  const prizes = settings.wheelPrizes;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setCanvasSize(Math.min(width - 40, 500));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    drawWheel();
  }, [prizes, rotation, isDark, canvasSize]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const outerRimRadius = center - 5;
    const innerRimRadius = outerRimRadius - 15;
    const sliceAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, size, size);

    const rimGradient = ctx.createLinearGradient(0, 0, size, size);
    rimGradient.addColorStop(0, '#475569');
    rimGradient.addColorStop(1, '#1e293b');
    ctx.beginPath();
    ctx.arc(center, center, outerRimRadius, 0, 2 * Math.PI);
    ctx.fillStyle = rimGradient;
    ctx.fill();

    prizes.forEach((prize, i) => {
      const angle = i * sliceAngle + rotation;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, innerRimRadius, angle, angle + sliceAngle);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, canvasSize/35)}px Inter, sans-serif`;
      ctx.fillText(prize.length > 15 ? prize.substring(0, 13) + '..' : prize, innerRimRadius - 25, 5);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
  };

  const getWeightValue = (prob: PrizeProbability): number => {
    switch (prob) {
      case 'NEVER': return 0;
      case 'RARE': return 0.25;
      case 'NORMAL': return 1;
      case 'ENHANCED': return 3.5;
      case 'FREQUENT': return 8;
      default: return 1;
    }
  };

  const spinWheel = () => {
    if (isSpinning || prizes.length < 2) return;
    const weightedIndices: number[] = [];
    prizes.forEach((prize, idx) => {
      const weight = getWeightValue(settings.prizeWeights?.[prize] || 'NORMAL');
      for (let i = 0; i < Math.floor(weight * 20); i++) weightedIndices.push(idx);
    });
    const targetIndex = weightedIndices.length > 0 ? weightedIndices[Math.floor(Math.random() * weightedIndices.length)] : 0;
    setIsSpinning(true);
    setWinner(null);
    const sliceAngle = (2 * Math.PI) / prizes.length;
    const pointerPos = (3 * Math.PI) / 2;
    const totalSpins = 10 + Math.floor(Math.random() * 5);
    const targetRotationRaw = pointerPos - (targetIndex * sliceAngle + sliceAngle / 2) + (totalSpins * 2 * Math.PI);
    const duration = 6000;
    const startRotation = rotation;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);
      const currentRotation = startRotation + (targetRotationRaw - startRotation) * easeOut(progress);
      setRotation(currentRotation);
      const currentPeg = Math.floor(currentRotation / sliceAngle);
      if (currentPeg !== lastPegRef.current) {
        setPointerAngle(-20);
        setTimeout(() => setPointerAngle(0), 50);
        lastPegRef.current = currentPeg;
      }
      if (progress < 1) requestAnimationFrame(animate);
      else { setIsSpinning(false); setWinner(prizes[targetIndex]); }
    };
    requestAnimationFrame(animate);
  };

  const addPrize = () => { if (newPrize.trim()) { setSettings(prev => ({ ...prev, wheelPrizes: [...prev.wheelPrizes, newPrize.trim()] })); setNewPrize(''); } };
  const removePrize = (index: number) => { if (prizes.length > 2) { const pToRemove = prizes[index]; const { [pToRemove]: _, ...rest } = settings.prizeWeights || {}; setSettings(prev => ({ ...prev, wheelPrizes: prev.wheelPrizes.filter((_, i) => i !== index), prizeWeights: rest })); } };

  return (
    <div className="relative">
      <div className={`max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center animate-in fade-in duration-700`}>
        <div ref={containerRef} className="flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div 
              className="absolute top-[-25px] left-1/2 -translate-x-1/2 z-30 transition-transform duration-75 origin-top"
              style={{ transform: `translateX(-50%) rotate(${pointerAngle}deg)` }}
            >
              <div className="w-10 h-14 bg-slate-200 rounded-b-full border shadow-lg relative">
                <div className="absolute top-[75%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-rose-600"></div>
              </div>
            </div>
            <div className={`p-2 rounded-full border-8 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-white'} shadow-2xl`}>
              <canvas ref={canvasRef} width={canvasSize} height={canvasSize} className="rounded-full cursor-pointer" onClick={spinWheel} />
            </div>
          </div>
          <button 
            onClick={spinWheel}
            disabled={isSpinning || prizes.length < 2}
            className={`px-12 py-5 rounded-[2.5rem] font-black text-xl md:text-2xl transition-all shadow-xl active:scale-95 flex items-center gap-4 ${isSpinning || prizes.length < 2 ? 'bg-slate-700 text-slate-500 opacity-50' : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-emerald-600 text-white'}`}
          >
            <RotateCw size={28} className={isSpinning ? 'animate-spin' : ''} />
            {isSpinning ? '...' : t.spin}
          </button>
        </div>

        <div className={`p-6 md:p-10 rounded-[3rem] border shadow-2xl flex flex-col h-fit ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-md">
                <Trophy size={28} />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
                <h3 className="text-2xl md:text-3xl font-black">{t.wheel}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.prizes}</p>
            </div>
          </div>

          <div className={`flex gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <input 
              type="text" 
              value={newPrize}
              onChange={(e) => setNewPrize(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPrize()}
              placeholder={t.addPrize}
              className={`flex-1 border rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-all font-bold text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
            />
            <button onClick={addPrize} className="bg-indigo-600 hover:bg-indigo-500 text-white w-14 h-14 rounded-2xl transition-all shadow-lg flex items-center justify-center shrink-0">
              <Plus size={28} />
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {prizes.map((prize, idx) => {
              const prob = settings.prizeWeights?.[prize] || 'NORMAL';
              return (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border group transition-all ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>{idx + 1}</div>
                    <div className={isRTL ? 'text-right' : ''}>
                      <p className="font-black text-sm truncate max-w-[120px]">{prize}</p>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                        {prob === 'NEVER' ? t.probNever : prob === 'RARE' ? t.probRare : prob === 'ENHANCED' ? t.probEnhanced : prob === 'FREQUENT' ? t.probFrequent : t.probNormal}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => removePrize(idx)} className="text-slate-600 hover:text-rose-500 p-2"><Trash2 size={16} /></button>
                </div>
              );
            })}
          </div>
        </div>

        {winner && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-8 max-w-md w-full">
                <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl mx-auto border-4 border-white/20">
                  <Trophy size={80} className="text-white drop-shadow-lg" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter">{t.congratulations}!</h2>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-8 rounded-[3rem] shadow-2xl">
                    <p className="text-xs text-emerald-400 font-black uppercase tracking-[0.4em] mb-3">{t.prize}</p>
                    <p className="text-4xl font-black text-white">{winner}</p>
                  </div>
                </div>
                <button onClick={() => setWinner(null)} className="px-20 py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xl hover:bg-emerald-500 hover:text-white transition-all shadow-2xl">DONE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WheelOfFortune;

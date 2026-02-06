
import React, { useState, useMemo } from 'react';
import { Transaction, AppSettings } from '../types';
import { LayoutGrid, Plus, Minus, TrendingUp, Gamepad2, Clock, AlertCircle, Layout } from 'lucide-react';

interface TableManagerProps {
  transactions: Transaction[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: any;
  isRTL: boolean;
  isDark: boolean;
}

type Period = 'TODAY' | 'WEEKLY' | 'MONTHLY';

const TableManager: React.FC<TableManagerProps> = ({ transactions = [], settings, setSettings, t, isRTL, isDark }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('TODAY');

  const addTable = () => {
    setSettings(prev => ({ ...prev, tableCount: (prev.tableCount || 0) + 1 }));
  };

  const removeTable = () => {
    if (settings.tableCount > 1) {
      setSettings(prev => ({ ...prev, tableCount: prev.tableCount - 1 }));
    }
  };

  const tableStats = useMemo(() => {
    const now = new Date();
    let startTime = new Date();
    
    if (selectedPeriod === 'TODAY') {
      if (now.getHours() < 8) startTime.setDate(startTime.getDate() - 1);
      startTime.setHours(8, 0, 0, 0);
    } else if (selectedPeriod === 'WEEKLY') {
      startTime.setDate(now.getDate() - 7);
    } else {
      startTime.setDate(now.getDate() - 30);
    }

    const startTimeMs = startTime.getTime();
    
    // Safety check for transactions array
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const filteredTransactions = safeTransactions.filter(tr => tr && tr.timestamp >= startTimeMs && tr.isSettled);
    
    const stats: Record<number, { games: number, revenue: number }> = {};
    const tableCount = settings.tableCount || 1;
    
    for (let i = 1; i <= tableCount; i++) {
      stats[i] = { games: 0, revenue: 0 };
    }

    filteredTransactions.forEach(tr => {
      const gameTables = Array.isArray(tr.gameTables) ? tr.gameTables : [];
      if (gameTables.length > 0) {
        gameTables.forEach((tableNum) => {
          const num = Number(tableNum);
          if (num > 0 && stats[num]) {
            stats[num].games += 1;
            stats[num].revenue += (tr.totalPaid || 0) / gameTables.length;
          }
        });
      }
    });

    return stats;
  }, [transactions, selectedPeriod, settings.tableCount]);

  const formatCurrency = (val: number) => Math.round(val).toLocaleString() + " IQD";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Management Control Panel */}
      <div className={`bg-slate-800 border border-slate-700 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden ${isRTL ? 'text-right' : ''}`}>
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
           <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                <LayoutGrid size={32} />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-white">{t.tableMgmt}</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                   {t.tables}: {settings.tableCount}
                 </p>
              </div>
           </div>

           <div className={`flex items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={removeTable}
                className="w-12 h-12 rounded-xl bg-slate-800 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90"
                title={t.removeTable}
              >
                <Minus size={20} />
              </button>
              <div className="w-16 text-center font-black text-2xl text-white">
                {settings.tableCount}
              </div>
              <button 
                onClick={addTable}
                className="w-12 h-12 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center shadow-lg active:scale-90"
                title={t.addTable}
              >
                <Plus size={20} />
              </button>
           </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="space-y-6">
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp size={16} className="text-emerald-400" /> {t.tableStats}
           </h4>
           
           <div className={`flex gap-2 p-1 bg-slate-800 rounded-xl border border-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {(['TODAY', 'WEEKLY', 'MONTHLY'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                    selectedPeriod === p 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {p === 'TODAY' ? t.today : p === 'WEEKLY' ? t.weekly : t.monthly}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {Object.entries(tableStats).length === 0 ? (
             <div className="col-span-full py-12 text-center text-slate-500 italic">
               No data available for statistics.
             </div>
           ) : Object.entries(tableStats).map(([num, data]) => {
             const stats = data as { games: number; revenue: number };
             return (
               <div key={num} className="bg-slate-800 border border-slate-700 rounded-[2rem] p-6 shadow-lg hover:border-slate-500 transition-all group overflow-hidden relative">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  
                  <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-700 shadow-inner">
                        <span className="text-2xl font-black text-indigo-400">{num}</span>
                     </div>
                     <div className={isRTL ? 'text-left' : 'text-right'}>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.table}</span>
                     </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                     <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 text-slate-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                           <Gamepad2 size={14} />
                           <span className="text-[10px] font-bold uppercase">{t.gamesPlayed}</span>
                        </div>
                        <span className="text-lg font-black text-white">{stats.games}</span>
                     </div>

                     <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 text-slate-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                           <Clock size={14} />
                           <span className="text-[10px] font-bold uppercase">{t.revenue}</span>
                        </div>
                        <span className="text-lg font-black text-emerald-400">{formatCurrency(stats.revenue)}</span>
                     </div>
                  </div>
                  
                  <div className="mt-6 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-indigo-500 transition-all duration-1000"
                       style={{ width: `${Math.min(100, (stats.games / 20) * 100)}%` }}
                     ></div>
                  </div>
               </div>
             );
           })}
        </div>
      </div>

      <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex items-start gap-4">
        <AlertCircle className="text-indigo-400 shrink-0" size={20} />
        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
          {isRTL 
            ? 'لێرە دەتوانیت ژمارەی مێزەکانی هۆڵەکە زیاد یان کەم بکەیت. هەر گۆڕانکارییەک بکەیت کاریگەری دەبێت لەسەر بەشی یارییە چالاکەکان و داشبۆرد.'
            : 'Here you can adjust the total number of tables in your hall. Any changes will immediately reflect in the session manager and performance dashboards.'}
        </p>
      </div>
    </div>
  );
};

export default TableManager;

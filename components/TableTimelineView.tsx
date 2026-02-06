
import React, { useMemo, useState, useRef } from 'react';
import { Transaction, AppSettings } from '../types';
import { Clock, AlertTriangle, CheckCircle2, Calendar, LayoutGrid, Info, Eye, Trash2, CheckSquare, Square, BarChart3, TrendingDown, Gauge, Timer, ArrowRight, Settings2, X, ArrowLeftRight } from 'lucide-react';

interface AuditEvent {
  table: number;
  startTime: number;
  playerName: string;
  id: string;
}

interface TableTimelineViewProps {
  transactions: Transaction[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: any;
  isRTL: boolean;
  isDark: boolean;
  onDeleteTransactions?: (ids: string[]) => void;
}

interface TableLeakStats {
  tableNum: number;
  recordedGames: number;
  totalIdleMinutes: number;
  estMissingGames: number;
  estLoss: number;
  efficiency: number;
}

const TableTimelineView: React.FC<TableTimelineViewProps> = ({ transactions, settings, setSettings, t, isRTL, isDark, onDeleteTransactions }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  
  // Long press state for bulk delete
  const [isPressingDelete, setIsPressingDelete] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const deleteIntervalRef = useRef<number | null>(null);

  const auditData = useMemo<Record<string, AuditEvent[]>>(() => {
    const businessStart = new Date(selectedDate);
    businessStart.setHours(8, 0, 0, 0);
    const businessEnd = new Date(businessStart);
    businessEnd.setDate(businessEnd.getDate() + 1);

    const startMs = businessStart.getTime();
    const endMs = businessEnd.getTime();

    const allEvents: AuditEvent[] = [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    safeTransactions.forEach(tr => {
      if (tr.timestamp >= startMs && tr.timestamp < endMs) {
        const times = Array.isArray(tr.gameStartTimes) ? tr.gameStartTimes : [];
        const tables = Array.isArray(tr.gameTables) ? tr.gameTables : [];
        
        times.forEach((time, idx) => {
          const tableNum = tables[idx] || 0;
          if (tableNum > 0) {
            allEvents.push({
              table: tableNum,
              startTime: time,
              playerName: tr.playerName,
              id: tr.id
            });
          }
        });
      }
    });

    const tableTimelines: Record<string, AuditEvent[]> = {};
    const tableCount = settings.tableCount || 1;
    for (let i = 1; i <= tableCount; i++) {
      tableTimelines[i.toString()] = allEvents
        .filter(e => e.table === i)
        .sort((a, b) => a.startTime - b.startTime);
    }

    return tableTimelines;
  }, [transactions, selectedDate, settings.tableCount]);

  const leakStats = useMemo(() => {
    const stats: TableLeakStats[] = [];
    const durations = settings.tableGameDurations || {};

    Object.entries(auditData).forEach(([tableNum, events]) => {
      const tNum = parseInt(tableNum);
      const tableEvents = events as AuditEvent[];
      let totalIdle = 0;
      let estMissing = 0;

      const range = durations[tNum] || { min: 10, max: 15 };
      const threshold = range.max + 3;

      for (let i = 0; i < tableEvents.length - 1; i++) {
        const gapMs = tableEvents[i+1].startTime - tableEvents[i].startTime;
        const gapMin = Math.floor(gapMs / 60000);
        
        if (gapMin > threshold) {
          totalIdle += gapMin;
          const avgDuration = (range.min + range.max) / 2;
          estMissing += Math.floor(gapMin / avgDuration);
        }
      }

      const efficiency = (tableEvents.length + estMissing) > 0 
        ? Math.round((tableEvents.length / (tableEvents.length + estMissing)) * 100) 
        : 100;

      stats.push({
        tableNum: tNum,
        recordedGames: tableEvents.length,
        totalIdleMinutes: totalIdle,
        estMissingGames: estMissing,
        estLoss: estMissing * (settings.pricePerGame || 1000),
        efficiency
      });
    });

    return stats;
  }, [auditData, settings.pricePerGame, settings.tableGameDurations]);

  const updateTableRange = (num: number, key: 'min' | 'max', val: number) => {
    const currentDurations = settings.tableGameDurations || {};
    const existingRange = currentDurations[num] || { min: 10, max: 15 };
    
    setSettings({
      ...settings,
      tableGameDurations: { 
        ...currentDurations, 
        [num]: { ...existingRange, [key]: Math.max(1, val) } 
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onDeleteTransactions?.(selectedIds);
    setSelectedIds([]);
  };

  const startDeletePress = () => {
    if (selectedIds.length === 0) return;
    setIsPressingDelete(true);
    setDeleteProgress(0);
    const startTime = Date.now();
    deleteIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setDeleteProgress(progress);
      if (elapsed >= 1000) {
        stopDeletePress();
        handleBulkDelete();
      }
    }, 20);
  };

  const stopDeletePress = () => {
    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
    setIsPressingDelete(false);
    setDeleteProgress(0);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isRTL_dir = isRTL ? 'rtl' : 'ltr';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20" dir={isRTL_dir}>
      {/* Control Header */}
      <div className={`p-6 bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-lg flex flex-col xl:flex-row items-center justify-between gap-6`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
           <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400"><Eye size={24} /></div>
           <div>
             <h3 className="text-xl font-black text-white">{t.tableAudit}</h3>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.proTableNote}</p>
           </div>
        </div>

        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <button 
             onClick={() => setShowConfig(!showConfig)}
             className={`p-2.5 rounded-xl border transition-all ${showConfig ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
           >
              <Settings2 size={20} />
           </button>

           {selectedIds.length > 0 && (
             <div className="flex flex-col items-center">
                <button 
                  onMouseDown={startDeletePress}
                  onMouseUp={stopDeletePress}
                  onMouseLeave={stopDeletePress}
                  onTouchStart={startDeletePress}
                  onTouchEnd={stopDeletePress}
                  className="relative overflow-hidden flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs transition-all shadow-lg active:scale-95"
                >
                  {isPressingDelete && (
                    <div 
                      className="absolute bottom-0 left-0 h-full bg-black/30 transition-all ease-linear"
                      style={{ width: `${deleteProgress}%` }}
                    />
                  )}
                  <Trash2 size={16} className="relative z-10" /> 
                  <span className="relative z-10">{t.deleteSelected} ({selectedIds.length})</span>
                </button>
             </div>
           )}
           <input 
             type="date" 
             value={selectedDate} 
             onChange={(e) => setSelectedDate(e.target.value)} 
             className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold text-sm focus:outline-none" 
           />
        </div>
      </div>

      {/* Range Configuration Panel */}
      {showConfig && (
        <div className="bg-slate-800 border border-indigo-500/30 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
           <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner"><Timer size={24} /></div>
                 <div>
                    <h4 className="text-xl font-black text-white">{isRTL ? 'ڕێکخستنی کاتی یارییەکان' : 'Game Duration Ranges'}</h4>
                 </div>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: settings.tableCount }, (_, i) => i + 1).map(num => {
                const range = (settings.tableGameDurations || {})[num] || { min: 8, max: 12 };
                return (
                  <div key={num} className="p-6 rounded-[2rem] bg-slate-900 border border-slate-700 flex flex-col gap-4 group hover:border-indigo-500/50 transition-all">
                     <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t.table} {num}</span>
                        <LayoutGrid size={14} className="text-slate-700" />
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1.5">
                           <label className="text-[8px] font-black text-slate-600 uppercase tracking-tighter block text-center">Min</label>
                           <input 
                              type="number"
                              min="1"
                              value={range.min}
                              onChange={(e) => updateTableRange(num, 'min', parseInt(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-1 text-white font-black text-center focus:outline-none"
                           />
                        </div>
                        <div className="pt-4 text-slate-700">
                           <ArrowLeftRight size={16} />
                        </div>
                        <div className="flex-1 space-y-1.5">
                           <label className="text-[8px] font-black text-slate-600 uppercase tracking-tighter block text-center">Max</label>
                           <input 
                              type="number"
                              min="1"
                              value={range.max}
                              onChange={(e) => updateTableRange(num, 'max', parseInt(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-1 text-white font-black text-center focus:outline-none"
                           />
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {/* Revenue Leak Summary Table */}
      <div className={`p-8 rounded-[2.5rem] border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner"><BarChart3 size={28} /></div>
            <div className={isRTL ? 'text-right' : ''}>
               <h4 className="text-xl font-black text-white uppercase tracking-tight">{t.leakSummary}</h4>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left" dir={isRTL_dir}>
               <thead>
                  <tr className="border-b border-slate-700/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                     <th className="px-4 py-4">{t.table}</th>
                     <th className="px-4 py-4 text-center">{t.completedGames}</th>
                     <th className="px-4 py-4 text-center">{t.totalIdle}</th>
                     <th className="px-4 py-4 text-center text-rose-400">{t.missingGames}</th>
                     <th className="px-4 py-4 text-center text-rose-500">{t.estLoss}</th>
                     <th className="px-4 py-4 text-center">{t.efficiency}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-700/30">
                  {leakStats.map(stat => (
                    <tr key={stat.tableNum} className="hover:bg-slate-700/10 transition-colors">
                       <td className="px-4 py-5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white font-black">
                             {stat.tableNum}
                          </div>
                       </td>
                       <td className="px-4 py-5 text-center font-black text-white">{stat.recordedGames}</td>
                       <td className="px-4 py-5 text-center font-bold text-slate-400">{stat.totalIdleMinutes}m</td>
                       <td className="px-4 py-5 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black ${stat.estMissingGames > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                             {stat.estMissingGames}
                          </span>
                       </td>
                       <td className="px-4 py-5 text-center font-black text-rose-500">
                          {stat.estLoss.toLocaleString()}
                       </td>
                       <td className="px-4 py-5">
                          <div className="flex flex-col items-center gap-1.5">
                             <span className="text-xs font-black text-white">{stat.efficiency}%</span>
                             <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ${stat.efficiency > 80 ? 'bg-emerald-500' : stat.efficiency > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${stat.efficiency}%` }}
                                ></div>
                             </div>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Timeline List for each Table */}
      <div className="grid grid-cols-1 gap-12">
        {Object.entries(auditData).map(([tableNum, events]) => {
          const tableInt = parseInt(tableNum);
          const tableEvents = events as AuditEvent[];
          const range = (settings.tableGameDurations || {})[tableInt] || { min: 8, max: 12 };
          
          return (
            <div key={tableNum} className={`p-8 rounded-[3rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
              
              <div className={`flex items-center justify-between mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-600/20">
                       {tableNum}
                    </div>
                    <div>
                       <h4 className="text-2xl font-black text-white uppercase tracking-tight">{t.table} {tableNum}</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{t.completedGames}: {tableEvents.length}</p>
                    </div>
                 </div>
                 <div className="px-5 py-2.5 bg-slate-900 border border-slate-700 rounded-[1.25rem] flex items-center gap-3">
                    <Timer size={16} className="text-indigo-400" />
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'مەودای کاتی' : 'Defined Range'}</span>
                       <span className="text-xs font-black text-slate-200">{range.min} - {range.max} {isRTL ? 'خولەک' : 'min'}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-6 relative">
                {tableEvents.length === 0 ? (
                  <div className="py-16 text-center text-slate-600 font-bold italic opacity-30 border-2 border-dashed border-slate-700 rounded-[2rem]">
                    No activity recorded for this table today.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tableEvents.map((event, idx) => {
                      const nextEvent = tableEvents[idx + 1];
                      const durationMs = nextEvent ? nextEvent.startTime - event.startTime : 0;
                      const durationMin = Math.floor(durationMs / 60000);
                      const isSelected = selectedIds.includes(event.id);
                      const isShortGame = nextEvent && durationMin < range.min;

                      return (
                        <div key={`${event.id}-${idx}`} className="flex flex-col">
                           <div 
                              onClick={() => toggleSelect(event.id)}
                              className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-indigo-600/20 border-indigo-500 shadow-inner' : isDark ? 'bg-slate-900/40 border-slate-700/50 hover:border-emerald-500/40' : 'bg-slate-50 border-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}
                           >
                              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-800 text-slate-600 group-hover:text-emerald-500 group-hover:bg-emerald-500/10'}`}>
                                    {isSelected ? <CheckSquare size={20} /> : <Clock size={20} />}
                                 </div>
                                 <div>
                                    <div className={`flex items-center gap-2 mb-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.clockIn}</span>
                                       <span className={`text-base font-black ${isSelected ? 'text-indigo-400' : 'text-white'}`}>{formatTime(event.startTime)}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">{event.playerName}</p>
                                 </div>
                              </div>

                              <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                 {nextEvent && (
                                   <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${isShortGame ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <Timer size={14} className="shrink-0" />
                                      <div className={isRTL ? 'text-right' : ''}>
                                         <p className="text-[8px] font-black uppercase tracking-tighter opacity-60">{isRTL ? 'ماوەی یاری' : 'Game Duration'}</p>
                                         <p className="text-sm font-black leading-none">{durationMin} {isRTL ? 'خولەک' : 'min'}</p>
                                      </div>
                                   </div>
                                 )}
                              </div>
                           </div>

                           {nextEvent && (
                             <div className={`relative px-12 py-3 flex items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                <div className={`absolute top-0 bottom-0 ${isRTL ? 'right-[2.45rem]' : 'left-[2.45rem]'} w-0.5 border-l-2 border-dashed border-slate-700/50`}></div>
                                
                                {durationMin > (range.max + 3) && (
                                  <div className={`flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 animate-in slide-in-from-top-1 duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                     <AlertTriangle size={12} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">{isRTL ? 'بۆشایی لە کاتی دیاریکراو زۆرترە' : 'Gap Exceeds Max Range'}</span>
                                  </div>
                                )}
                             </div>
                           )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] flex items-start gap-6 shadow-xl">
         <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Info size={32} />
         </div>
         <div className="space-y-2">
            <h5 className="font-black text-indigo-400 text-lg uppercase tracking-widest">{isRTL ? 'ڕێبەری چاودێری مەودای کاتی' : 'Range Audit Intelligence Guide'}</h5>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              {isRTL 
                ? 'ئەم بەشە پشت دەبەستێت بەو مەودا کاتییەی کە خۆت دیاریت کردووە. ئەگەر یارییەک لە کەمترین کات خێراتر بێت یان بۆشایی نێوان یارییەکان لە زۆرترین کات زیاتر بێت، سیستەمەکە ئاگادارت دەکاتەوە بۆ دڵنیابوون لە داهاتەکانت.'
                : 'This section monitors activity based on your custom min-max ranges. Games shorter than the minimum suggest rushed logging, while gaps longer than the maximum suggest unrecorded play.'}
            </p>
         </div>
      </div>
    </div>
  );
};

export default TableTimelineView;

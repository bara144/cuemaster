
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, User, Role, AppSettings, AttendanceRecord } from '../types';
import { DollarSign, Gamepad2, Users, TrendingUp, Calendar, Clock, UserMinus, Activity, Shield, Timer, ChevronRight, X, List, History, Power, ListTree, Trash2 } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  users: User[];
  settings: AppSettings;
  t: any;
  currentUser: User;
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, users, settings, t, currentUser, attendanceRecords, setAttendanceRecords }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedStaffHistory, setSelectedStaffHistory] = useState<User | null>(null);
  const [viewingLogoutsForDay, setViewingLogoutsForDay] = useState<{ date: string, times: number[] } | null>(null);

  // Long press state
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getDefaultReportDate = () => {
    const now = new Date();
    if (now.getHours() < 8) now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getDefaultReportDate());

  const stats = useMemo(() => {
    const settledTransactions = transactions.filter(t => t.isSettled);
    const totalRevenue = settledTransactions.reduce((acc, t) => acc + t.totalPaid, 0);
    
    const businessStart = new Date(selectedDate);
    businessStart.setHours(8, 0, 0, 0);
    const businessEnd = new Date(businessStart);
    businessEnd.setDate(businessEnd.getDate() + 1);

    const startMs = businessStart.getTime();
    const endMs = businessEnd.getTime();

    const dailyTransactions = transactions.filter(t => t.timestamp >= startMs && t.timestamp < endMs);
    const dailySettledTransactions = dailyTransactions.filter(t => t.isSettled);
    const dailyIncome = dailySettledTransactions.reduce((acc, t) => acc + t.totalPaid, 0);

    const outstandingDebts = transactions.filter(t => t.paymentMethod === 'DEBT' && !t.isSettled);
    const totalDebtAmount = outstandingDebts.reduce((acc, t) => acc + t.totalPaid, 0);

    const relevantUsers = users.filter(u => u.hallId === currentUser.hallId);

    const staffShiftCollections = relevantUsers.map(user => {
      const settledAmount = dailySettledTransactions
        .filter(tr => tr.collectedBy === user.id)
        .reduce((sum, tr) => sum + tr.totalPaid, 0);
      const debtGivenAmount = dailyTransactions
        .filter(tr => tr.collectedBy === user.id && tr.paymentMethod === 'DEBT' && !tr.isSettled)
        .reduce((sum, tr) => sum + tr.totalPaid, 0);
      return { ...user, shiftTotal: settledAmount, shiftDebt: debtGivenAmount };
    }).filter(u => u.shiftTotal > 0 || u.shiftDebt > 0 || u.role === Role.STAFF)
    .sort((a, b) => b.shiftTotal - a.shiftTotal);

    const staffPresence = relevantUsers.filter(u => u.role === Role.STAFF).map(user => {
      const activeRecord = attendanceRecords.find(r => r.userId === user.id && r.clockOut === null);
      return { ...user, activeRecord };
    });

    const activeStaffCount = staffPresence.filter(s => !!s.activeRecord).length;

    const hourlyData = [];
    let maxRevenueInShift = 0;

    for (let i = 0; i < 24; i++) {
      const slotStart = new Date(businessStart.getTime() + i * 3600000);
      const slotTransactions = dailySettledTransactions.filter(tr => tr.timestamp >= slotStart.getTime() && tr.timestamp < slotStart.getTime() + 3600000);
      const slotRevenue = slotTransactions.reduce((acc, tr) => acc + tr.totalPaid, 0);
      const slotGames = slotTransactions.reduce((acc, tr) => acc + (tr.gameStartTimes?.length || 0), 0);
      if (slotRevenue > maxRevenueInShift) maxRevenueInShift = slotRevenue;
      hourlyData.push({
        label: slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        revenue: slotRevenue,
        games: slotGames
      });
    }

    return { totalRevenue, dailyIncome, dailyCount: dailySettledTransactions.length, hourlyData, staffShiftCollections, activeStaffCount, maxRevenueInShift, totalDebtAmount, staffPresence };
  }, [transactions, users, selectedDate, currentUser, attendanceRecords]);

  // Logic to group attendance records by user and date
  const groupedStaffHistory = useMemo(() => {
    if (!selectedStaffHistory) return [];

    const staffRecords = attendanceRecords.filter(r => r.userId === selectedStaffHistory.id);
    const groups: Record<string, { id: string, date: string, clockIn: number, clockOut: number | null, allLogouts: number[], totalDuration: number }> = {};

    staffRecords.forEach(record => {
      const dateKey = record.date;
      const history = Array.isArray(record.logouts) ? record.logouts : (record.clockOut ? [record.clockOut] : []);
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          id: record.id,
          date: record.date,
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          allLogouts: history,
          totalDuration: record.clockOut ? (record.clockOut - record.clockIn) : (currentTime - record.clockIn)
        };
      } else {
        if (record.clockIn < groups[dateKey].clockIn) {
          groups[dateKey].clockIn = record.clockIn;
        }
        groups[dateKey].allLogouts = Array.from(new Set([...groups[dateKey].allLogouts, ...history]));
        if (record.clockOut === null) {
          groups[dateKey].clockOut = null;
        } else if (groups[dateKey].clockOut !== null && (record.clockOut === null || record.clockOut > groups[dateKey].clockOut)) {
           // This case shouldn't normally happen with proper logic but for robustness:
           if (record.clockOut === null) groups[dateKey].clockOut = null;
           else groups[dateKey].clockOut = record.clockOut;
        }
        const duration = record.clockOut ? (record.clockOut - record.clockIn) : (currentTime - record.clockIn);
        groups[dateKey].totalDuration += duration;
      }
    });

    return Object.values(groups).sort((a, b) => b.clockIn - a.clockIn);
  }, [attendanceRecords, selectedStaffHistory, currentTime]);

  const handleDeleteDay = (date: string, userId: string) => {
    setAttendanceRecords(prev => prev.filter(r => !(r.userId === userId && r.date === date)));
    if (window.navigator.vibrate) window.navigator.vibrate(100);
  };

  const handleStartPress = (id: string, date: string, userId: string) => {
    setPressingId(id);
    setProgress(0);
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const diff = Date.now() - start;
      const p = Math.min((diff / 1000) * 100, 100);
      setProgress(p);
      if (diff >= 1000) {
        handleStopPress();
        handleDeleteDay(date, userId);
      }
    }, 20);
  };

  const handleStopPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPressingId(null);
    setProgress(0);
  };

  const generateReportText = () => {
    let report = `📊 ${t.appName} - ${t.dailyReport}\n📅 ${t.startDate}: ${selectedDate}\n--------------------------------\n\n`;
    report += `💰 ${t.financialSummary}:\n- ${t.dailyIncome}: ${stats.dailyIncome.toLocaleString()} IQD\n- ${t.completedGames}: ${stats.dailyCount}\n- ${t.totalDebt}: ${stats.totalDebtAmount.toLocaleString()} IQD\n\n`;
    report += `👥 ${t.revenueByStaff}:\n`;
    stats.staffShiftCollections.filter(s => s.shiftTotal > 0 || s.shiftDebt > 0).forEach(s => {
      report += `- ${s.username}: ${s.shiftTotal.toLocaleString()} IQD (Debt: ${s.shiftDebt.toLocaleString()} IQD)\n`;
    });
    return report;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const calculateFormattedDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return settings.language === 'ckb' ? `${hours} کاتژمێر و ${minutes} خولەک` : `${hours}h ${minutes}m`;
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatValue = (val: number) => val.toLocaleString() + " IQD";
  const isRTL = settings.language === 'ckb';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className={`flex flex-col xl:flex-row items-center justify-between gap-4 p-6 bg-slate-800 border border-slate-700 rounded-[2rem] shadow-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
           <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400"><Calendar size={24} /></div>
           <h3 className="text-lg font-black text-white">{t.dashboard}</h3>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold text-sm focus:outline-none" />
           <button onClick={handleCopyReport} className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs">{copySuccess ? t.reportCopied : t.copyReport}</button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<TrendingUp className="text-emerald-500" />} label={t.dailyIncome} value={formatValue(stats.dailyIncome)} subtext="Shift 08:00 - 08:00" />
        <StatCard icon={<UserMinus className="text-rose-500" />} label={t.totalDebt} value={formatValue(stats.totalDebtAmount)} subtext="" />
        <StatCard icon={<Gamepad2 className="text-purple-500" />} label={t.completedGames} value={stats.dailyCount.toString()} subtext="" />
        <StatCard icon={<Users className="text-orange-500" />} label={t.activeStaff} value={stats.activeStaffCount.toString()} subtext="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Progress Section */}
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-[2.5rem] shadow-lg flex flex-col min-h-[350px]">
          <h4 className={`text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Activity size={18} className="text-emerald-500" /> {t.revenueByStaff}</h4>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            {stats.staffShiftCollections.map((item, idx) => {
              const maxVal = stats.staffShiftCollections[0]?.shiftTotal || 1;
              return (
                <div key={idx} className="space-y-3">
                  <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-black text-slate-200">{item.username}</span>
                    <span className="text-sm font-black text-emerald-400">{formatValue(item.shiftTotal)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(item.shiftTotal / maxVal) * 100}%` }}></div>
                  </div>
                </div>
              );
            })}
            {stats.staffShiftCollections.length === 0 && <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">No activity recorded for this period.</div>}
          </div>
        </div>

        {/* Hourly Flow Chart */}
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-[2.5rem] shadow-lg flex flex-col min-h-[350px]">
           <h4 className={`text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Clock size={18} className="text-blue-500" /> {t.hourlyReport}</h4>
           <div className="flex-1 flex items-end justify-between gap-1 h-full">
              {stats.hourlyData.filter((_, i) => i % 2 === 0).map((hour, idx) => {
                const fill = stats.maxRevenueInShift > 0 ? (hour.revenue / stats.maxRevenueInShift) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-slate-900 rounded-t-lg relative overflow-hidden" style={{ height: '180px' }}>
                       <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-blue-600 to-indigo-500 transition-all duration-1000" style={{ height: `${Math.max(4, fill)}%` }}></div>
                    </div>
                    <span className="text-[9px] font-black text-slate-500 mt-3">{hour.label.split(':')[0]}</span>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Staff Presence */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-8 rounded-[3rem] shadow-2xl overflow-hidden relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
           <div className={`flex items-center justify-between mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                 <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner"><Users size={28} /></div>
                 <div>
                    <h4 className="text-xl font-black text-white">{isRTL ? 'ئامادەبوونی ستاف' : 'Staff Presence'}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Duty Monitoring</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-2xl border border-slate-700">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.live}</span>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {stats.staffPresence.map((staff) => {
                const isActive = !!staff.activeRecord;
                return (
                  <div key={staff.id} className={`p-6 rounded-[2rem] border transition-all hover:border-indigo-500/30 group ${isActive ? 'bg-emerald-600/5 border-emerald-500/20' : 'bg-slate-900/50 border-slate-700/50 opacity-80'}`}>
                     <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg ${isActive ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                             {staff.username[0].toUpperCase()}
                           </div>
                           <div>
                              <h5 className="font-black text-white text-lg">{staff.username}</h5>
                              <div className={`flex items-center gap-1.5 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                 <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-emerald-500' : 'text-slate-500'}`}>{isActive ? t.onDuty : t.offDuty}</span>
                              </div>
                           </div>
                        </div>
                        <button 
                          onClick={() => setSelectedStaffHistory(staff)}
                          className="p-2 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                          title={t.attendanceLog}
                        >
                          <History size={18} />
                        </button>
                     </div>

                     {isActive && staff.activeRecord ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                           <div className="grid grid-cols-2 gap-3">
                              <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                                 <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">{t.clockIn}</span>
                                 <span className="text-xs font-black text-white">{formatTime(staff.activeRecord.clockIn)}</span>
                              </div>
                              <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                                 <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">{t.workDuration}</span>
                                 <span className="text-xs font-black text-emerald-400">{calculateFormattedDuration(currentTime - staff.activeRecord.clockIn)}</span>
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="py-4 text-center text-[10px] font-bold text-slate-600 uppercase italic opacity-40">
                           {isRTL ? 'بۆ ئەمڕۆ دەستپێکی دەوام تۆمار نەکراوە' : 'No active shift today'}
                        </div>
                     )}
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      {/* Staff History Modal */}
      {selectedStaffHistory && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-slate-800 w-full max-w-4xl max-h-[85vh] rounded-[3rem] border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className={`p-8 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                    <History size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{t.attendanceLog}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedStaffHistory.username}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStaffHistory(null)} className="w-12 h-12 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedStaffHistory.map((record, idx) => {
                        const isPressing = pressingId === record.id;
                        return (
                          <div key={`${record.date}-${idx}`} className={`p-6 rounded-[2rem] border ${isRTL ? 'text-right' : ''} ${record.clockOut === null ? 'bg-emerald-600/5 border-emerald-500/30 ring-2 ring-emerald-500/10' : 'bg-slate-900/40 border-slate-700'}`}>
                             <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                   <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-50"><Calendar size={20} /></div>
                                   <span className="font-black text-white">{record.date}</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {record.clockOut === null && (
                                    <div className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase animate-pulse tracking-widest">Active Now</div>
                                  )}
                                  
                                  <button 
                                    onMouseDown={() => handleStartPress(record.id, record.date, selectedStaffHistory.id)}
                                    onMouseUp={handleStopPress}
                                    onMouseLeave={handleStopPress}
                                    onTouchStart={() => handleStartPress(record.id, record.date, selectedStaffHistory.id)}
                                    onTouchEnd={handleStopPress}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="relative w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all overflow-hidden active:scale-90"
                                  >
                                     {isPressing && (
                                        <div 
                                          className="absolute bottom-0 left-0 h-full bg-rose-500/40 transition-all ease-linear"
                                          style={{ width: `${progress}%` }}
                                        />
                                     )}
                                     <Trash2 size={18} className="relative z-10" />
                                  </button>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                                   <p className="text-[9px] font-black text-slate-500 uppercase mb-1">{t.clockIn}</p>
                                   <p className="text-sm font-black text-white">{formatTime(record.clockIn)}</p>
                                </div>
                                <button 
                                  onClick={() => record.allLogouts.length > 0 && setViewingLogoutsForDay({ date: record.date, times: record.allLogouts })}
                                  className={`p-4 rounded-2xl bg-slate-900/80 border border-slate-800 transition-all text-left group ${record.allLogouts.length > 0 ? 'hover:border-indigo-500/50 hover:bg-slate-700/50' : ''}`}
                                >
                                   <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">{t.clockOut}</p>
                                      {record.allLogouts.length > 1 && <ListTree size={12} className="text-indigo-400" />}
                                   </div>
                                   <p className="text-sm font-black text-white">{record.clockOut ? formatTime(record.clockOut) : '--:--'}</p>
                                   {record.allLogouts.length > 1 && <span className="text-[7px] text-indigo-400 font-bold uppercase">{isRTL ? 'بینیینی هەمووی' : 'View Detailed'}</span>}
                                </button>
                             </div>
                             <div className={`mt-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-2 text-indigo-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                   <Timer size={14} />
                                   <span className="text-[10px] font-black uppercase">{t.workDuration}</span>
                                </div>
                                <span className="text-sm font-black text-white">
                                  {calculateFormattedDuration(record.totalDuration)}
                                </span>
                             </div>
                          </div>
                        );
                      })}
                    {groupedStaffHistory.length === 0 && (
                       <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center gap-4 opacity-30">
                          <History size={48} />
                          <p className="font-bold">{isRTL ? 'هیچ مێژوویەک بۆ ئەم ستافە تۆمار نەکراوە' : 'No records found for this staff member.'}</p>
                       </div>
                    )}
                 </div>
              </div>

              <div className="p-8 border-t border-slate-700 bg-slate-800/50">
                 <button onClick={() => setSelectedStaffHistory(null)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95">{t.confirmAction || 'OK'}</button>
              </div>
           </div>
        </div>
      )}

      {/* Daily Logouts Detail Sub-Modal */}
      {viewingLogoutsForDay && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className={`p-6 border-b border-slate-800 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <ListTree size={20} className="text-indigo-400" />
                    <div>
                       <h4 className="font-black text-white text-lg">{isRTL ? 'کاتەکانی چوونەدەرەوە' : 'Logout Timestamps'}</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase">{viewingLogoutsForDay.date}</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingLogoutsForDay(null)} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {viewingLogoutsForDay.times.sort((a, b) => a - b).map((time, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                       <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-black">#{idx + 1}</span>
                          <span className="text-slate-300 font-bold text-sm">{formatTime(time)}</span>
                       </div>
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.clockOut}</span>
                    </div>
                 ))}
              </div>
              <div className="p-6 border-t border-slate-800">
                 <button onClick={() => setViewingLogoutsForDay(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black transition-all active:scale-95 border border-slate-700">{t.confirmAction || 'OK'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) => (
  <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-sm transition-all hover:scale-[1.02] hover:border-slate-600">
    <div className="bg-slate-900/50 p-4 rounded-2xl w-fit mb-6 shadow-inner">{icon}</div>
    <h5 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</h5>
    <p className="text-2xl font-black text-white">{value}</p>
    {subtext && <p className="text-[9px] text-slate-500 mt-3 font-bold">{subtext}</p>}
  </div>
);

export default Dashboard;

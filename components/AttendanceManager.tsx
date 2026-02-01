
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, User, Role } from '../types';
import { Clock, LogIn, LogOut, Calendar, Users, Timer, Search, ShieldCheck, Activity, RotateCcw } from 'lucide-react';

interface AttendanceManagerProps {
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  currentUser: User;
  t: any;
  isRTL: boolean;
  isDark: boolean;
  isAdmin: boolean;
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ 
  attendanceRecords, 
  setAttendanceRecords, 
  currentUser, 
  t, 
  isRTL, 
  isDark, 
  isAdmin 
}) => {
  const [filter, setFilter] = useState('');

  // Check if current user has an active shift today
  const today = new Date().toISOString().split('T')[0];
  const currentActiveRecord = useMemo(() => {
    return attendanceRecords.find(r => r.userId === currentUser.id && r.date === today);
  }, [attendanceRecords, currentUser.id, today]);

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(r => 
      (isAdmin || r.userId === currentUser.id) &&
      r.username.toLowerCase().includes(filter.toLowerCase())
    ).sort((a, b) => b.clockIn - a.clockIn);
  }, [attendanceRecords, isAdmin, currentUser.id, filter]);

  const calculateDuration = (inTime: number, outTime: number | null) => {
    const end = outTime || Date.now();
    const diff = end - inTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Current Status Card */}
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl ${currentActiveRecord ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700/10 text-slate-500'}`}>
             <Activity size={40} className={currentActiveRecord ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{currentActiveRecord ? t.onDuty : t.offDuty}</h3>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
              {currentActiveRecord 
                ? `${t.currentlyWorking} (${formatTime(currentActiveRecord.clockIn)})` 
                : t.startShift}
            </p>
          </div>
        </div>

        {currentActiveRecord && (
          <div className="flex items-center gap-3">
             <div className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-2xl flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{isRTL ? 'جارەکانی چوونەدەرەوە' : 'Logouts Today'}</span>
                <span className="text-xl font-black text-white">{currentActiveRecord.logouts.length}</span>
             </div>
          </div>
        )}
      </div>

      {/* Attendance Logs */}
      <div className="space-y-6">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <h4 className={`text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
             <Calendar size={18} /> {t.attendanceLog}
           </h4>
           {isAdmin && (
             <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={16} />
                <input 
                  type="text"
                  placeholder={t.searchPlayers}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={`bg-slate-800 border border-slate-700 rounded-2xl py-2 px-10 text-sm text-white focus:outline-none focus:border-indigo-500 w-full md:w-64 ${isRTL ? 'text-right' : ''}`}
                />
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map(record => (
            <div key={record.id} className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.02] shadow-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
               <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black">
                        {record.username[0].toUpperCase()}
                     </div>
                     <div>
                        <p className="font-black text-white">{record.username}</p>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{record.date}</span>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${record.clockOut === null ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                      {record.clockOut === null ? 'Live' : 'Shift Ended'}
                    </span>
                    <span className="text-[7px] font-black text-slate-600 uppercase">{record.logouts.length} Logouts</span>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className={`flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <div className={`flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LogIn size={12} className="text-emerald-500" /> {t.clockIn}
                     </div>
                     <span className="text-sm font-black text-white">{formatTime(record.clockIn)}</span>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <div className={`flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LogOut size={12} className="text-rose-500" /> {t.clockOut}
                     </div>
                     <span className="text-sm font-black text-white">{record.clockOut ? formatTime(record.clockOut) : '--:--'}</span>
                  </div>

                  <div className={`flex items-center justify-between p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <div className={`flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Timer size={14} /> {t.workDuration}
                     </div>
                     <span className="text-base font-black text-white">{calculateDuration(record.clockIn, record.clockOut)}</span>
                  </div>
               </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[2rem]">
               <Clock size={48} className="mx-auto mb-4 opacity-10" />
               <p className="font-bold opacity-30">{t.noArchivedTournaments || 'No records found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;

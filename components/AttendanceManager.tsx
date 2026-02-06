
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AttendanceRecord, User, Role } from '../types';
import { Clock, LogIn, LogOut, Calendar, Timer, Trash2, Activity, History, Shield, List, Search, Filter } from 'lucide-react';

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
  attendanceRecords = [], 
  setAttendanceRecords, 
  currentUser, 
  t, 
  isRTL, 
  isDark, 
  isAdmin 
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredRecords = useMemo(() => {
    let records = Array.isArray(attendanceRecords) ? [...attendanceRecords] : [];
    
    // STRICT FILTERING LOGIC:
    // 1. Staff: Only their own records
    // 2. Hall Manager: Records matching their hallId
    // 3. Super Admin (username 'admin'): All records
    const isSuperAdmin = currentUser.role === Role.ADMIN && currentUser.username === 'admin';

    if (currentUser.role === Role.STAFF) {
      records = records.filter(r => r.userId === currentUser.id);
    } else if (!isSuperAdmin) {
      // For Hall Managers or sub-admins with hallId
      records = records.filter(r => r.hallId === currentUser.hallId);
    }

    // Search filter
    if (searchTerm.trim()) {
      records = records.filter(r => 
        r.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.date.includes(searchTerm)
      );
    }

    return records.sort((a, b) => b.clockIn - a.clockIn);
  }, [attendanceRecords, currentUser, searchTerm]);

  const handleDeleteRecord = (id: string) => {
    setAttendanceRecords(prev => prev.filter(r => r.id !== id));
    if (window.navigator.vibrate) window.navigator.vibrate(100);
  };

  const handleStartPress = (id: string) => {
    if (!isAdmin) return;
    setPressingId(id);
    setProgress(0);
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const diff = Date.now() - start;
      const p = Math.min((diff / 1000) * 100, 100);
      setProgress(p);
      if (diff >= 1000) {
        handleStopPress();
        handleDeleteRecord(id);
      }
    }, 20);
  };

  const handleStopPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPressingId(null);
    setProgress(0);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const calculateFormattedDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return isRTL ? `${hours} کاتژمێر و ${minutes} خولەک` : `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className={`flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
            <History size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{t.attendanceLog}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Audit Trail for Hall Access</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
          <input 
            type="text" 
            placeholder={isRTL ? 'گەڕان بۆ ناوی ستاف...' : 'Search staff or date...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 px-12 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold ${isRTL ? 'text-right' : ''}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecords.map(record => {
          const isDeleting = pressingId === record.id;
          const isActive = record.clockOut === null;
          const duration = isActive ? (currentTime - record.clockIn) : (record.clockOut! - record.clockIn);

          return (
            <div 
              key={record.id} 
              className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isActive ? 'ring-2 ring-emerald-500/30' : 'hover:border-indigo-500/30'}`}
            >
              <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg ${isActive ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    {record.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-white">{record.username}</h4>
                    <div className={`flex items-center gap-1.5 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Calendar size={12} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-500">{record.date}</span>
                    </div>
                  </div>
                </div>
                
                {isAdmin && (
                  <button 
                    onMouseDown={() => handleStartPress(record.id)}
                    onMouseUp={handleStopPress}
                    onMouseLeave={handleStopPress}
                    onTouchStart={() => handleStartPress(record.id)}
                    onTouchEnd={handleStopPress}
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all overflow-hidden active:scale-90"
                  >
                    {isDeleting && (
                      <div 
                        className="absolute bottom-0 left-0 h-full bg-rose-600/40 transition-all ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                    <Trash2 size={16} className="relative z-10" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                  <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">{t.clockIn}</span>
                  <span className="text-xs font-black text-white">{formatTime(record.clockIn)}</span>
                </div>
                <div className={`p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                  <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">{t.clockOut}</span>
                  <span className="text-xs font-black text-white">{record.clockOut ? formatTime(record.clockOut) : '--:--'}</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isActive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-indigo-500/5 border-indigo-500/10'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isActive ? 'text-emerald-400' : 'text-indigo-400'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Timer size={14} className={isActive ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-black uppercase">{t.workDuration}</span>
                </div>
                <span className={`text-xs font-black ${isActive ? 'text-emerald-400' : 'text-white'}`}>{calculateFormattedDuration(duration)}</span>
              </div>
              
              {isActive && (
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                  <div className="absolute top-2 right-[-20px] bg-emerald-500 text-white text-[7px] font-black uppercase py-0.5 px-6 rotate-45 shadow-sm">
                    LIVE
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredRecords.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center gap-4 opacity-30 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <Activity size={48} />
            <p className="font-bold">{isRTL ? 'هیچ تۆمارێک نەدۆزرایەوە' : 'No records found matching your search.'}</p>
          </div>
        )}
      </div>
      
      {isAdmin && (
        <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex items-start gap-4">
          <Shield className="text-indigo-400 shrink-0" size={20} />
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            {isRTL 
              ? 'تێبینی بۆ بەڕێوەبەر: تۆ دەتوانیت هەر تۆمارێکی هەڵە بسڕیتەوە بە پەنجە ڕاگرتن لەسەر ئایکۆنی تەنەکەی خۆڵەکە. ئەم کارە بۆ هەمیشە تۆمارەکە لادەبات.'
              : 'Admin Note: You can delete any incorrect record by holding the trash icon for 1 second. This action permanently removes the session from history.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;

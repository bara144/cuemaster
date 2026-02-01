
import React, { useMemo } from 'react';
import { Transaction, User, Role } from '../types';
import { TrendingUp, ArrowLeft, Calendar, DollarSign, UserMinus, Gamepad2, Users, Activity, BarChart3, Clock } from 'lucide-react';

interface HallStatsViewerProps {
  hallId: string;
  users: User[];
  t: any;
  isRTL: boolean;
  onBack: () => void;
}

const HallStatsViewer: React.FC<HallStatsViewerProps> = ({ hallId, users, t, isRTL, onBack }) => {
  // Load data for this specific hall from localStorage
  const hallTransactions: Transaction[] = useMemo(() => {
    const saved = localStorage.getItem(`cuemaster_transactions_${hallId}`);
    return saved ? JSON.parse(saved) : [];
  }, [hallId]);

  const stats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const settled = hallTransactions.filter(t => t.isSettled);
    const debts = hallTransactions.filter(t => t.paymentMethod === 'DEBT' && !t.isSettled);

    const daily = settled.filter(t => (now - t.timestamp) < oneDay).reduce((acc, t) => acc + t.totalPaid, 0);
    const weekly = settled.filter(t => (now - t.timestamp) < oneWeek).reduce((acc, t) => acc + t.totalPaid, 0);
    const monthly = settled.filter(t => (now - t.timestamp) < oneMonth).reduce((acc, t) => acc + t.totalPaid, 0);
    const totalDebt = debts.reduce((acc, t) => acc + t.totalPaid, 0);
    const totalGames = hallTransactions.reduce((acc, t) => acc + (t.gameStartTimes?.length || 1), 0);

    const hallUsers = users.filter(u => u.hallId === hallId);

    return { daily, weekly, monthly, totalDebt, totalGames, hallUsers };
  }, [hallTransactions, hallId, users]);

  const formatCurrency = (val: number) => val.toLocaleString() + " IQD";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className={`flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 opacity-30"></div>
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
           <button onClick={onBack} className="p-4 bg-slate-900 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-90">
             <ArrowLeft size={24} className={isRTL ? 'rotate-180' : ''} />
           </button>
           <div>
             <h3 className="text-3xl font-black text-white">{t.hallDetails}</h3>
             <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-xs text-indigo-400 font-black uppercase tracking-widest">ID: {hallId}</p>
             </div>
           </div>
        </div>
        
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="px-6 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t.activeStaff}</p>
              <p className="text-xl font-black text-white">{stats.hallUsers.length}</p>
           </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<TrendingUp className="text-emerald-400" />} label={t.dailyIncome} value={formatCurrency(stats.daily)} color="bg-emerald-500/10" border="border-emerald-500/20" />
        <StatCard icon={<Activity className="text-blue-400" />} label={t.weeklyRevenue} value={formatCurrency(stats.weekly)} color="bg-blue-500/10" border="border-blue-500/20" />
        <StatCard icon={<BarChart3 className="text-indigo-400" />} label={t.monthlyRevenue} value={formatCurrency(stats.monthly)} color="bg-indigo-500/10" border="border-indigo-500/20" />
        <StatCard icon={<UserMinus className="text-rose-400" />} label={t.totalDebt} value={formatCurrency(stats.totalDebt)} color="bg-rose-500/10" border="border-rose-500/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Secondary Stats */}
         <div className="p-8 bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-xl">
            <h4 className={`text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
               <Gamepad2 size={18} /> {t.tableStats}
            </h4>
            <div className="space-y-6">
               <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-400 font-bold">{t.completedGames}</span>
                  <span className="text-2xl font-black text-white">{stats.totalGames}</span>
               </div>
               <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-3/4 rounded-full"></div>
               </div>
            </div>
         </div>

         {/* Staff List */}
         <div className="p-8 bg-slate-800 border border-slate-700 rounded-[2.5rem] shadow-xl">
            <h4 className={`text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
               <Users size={18} /> {t.users}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {stats.hallUsers.map(user => (
                  <div key={user.id} className={`p-4 bg-slate-900 border border-slate-700 rounded-2xl flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                     <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg">
                        {user.username[0].toUpperCase()}
                     </div>
                     <div>
                        <p className="text-sm font-black text-white">{user.username}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">{user.role}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, border }: { icon: React.ReactNode, label: string, value: string, color: string, border: string }) => (
  <div className={`bg-slate-800 rounded-[2rem] border ${border} p-6 shadow-xl transition-all hover:scale-[1.03]`}>
    <div className={`${color} p-4 rounded-2xl w-fit mb-6 shadow-inner`}>{icon}</div>
    <h5 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</h5>
    <p className="text-xl font-black text-white tracking-tight">{value}</p>
  </div>
);

export default HallStatsViewer;


import React, { useState, useMemo } from 'react';
import { Transaction, User, Role, AppSettings } from '../types';
import { DollarSign, Gamepad2, Users, TrendingUp, ArrowUpRight, Clock, Wallet, UserMinus, Droplets, ReceiptText, Calendar, FileDown, CheckCircle2, Mail, Copy, Share2 } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  users: User[];
  settings: AppSettings;
  t: any;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, users, settings, t, currentUser }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const getDefaultReportDate = () => {
    const now = new Date();
    if (now.getHours() < 8) {
      now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getDefaultReportDate());

  const stats = useMemo(() => {
    const settledTransactions = transactions.filter(t => t.isSettled);
    const totalRevenue = settledTransactions.reduce((acc, t) => acc + t.totalPaid, 0);
    const totalGames = transactions.reduce((acc, t) => acc + (t.amount / settings.pricePerGame), 0);
    
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

    // Filter relevant users to ONLY those in the current hall (even for Super Admin)
    const relevantUsers = users.filter(u => u.hallId === currentUser.hallId);

    const staffShiftCollections = relevantUsers.map(user => {
      const settledAmount = dailySettledTransactions
        .filter(tr => tr.collectedBy === user.id)
        .reduce((sum, tr) => sum + tr.totalPaid, 0);

      const debtGivenAmount = dailyTransactions
        .filter(tr => tr.collectedBy === user.id && tr.paymentMethod === 'DEBT' && !tr.isSettled)
        .reduce((sum, tr) => sum + tr.totalPaid, 0);

      return { ...user, shiftTotal: settledAmount, shiftDebt: debtGivenAmount };
    }).filter(u => u.shiftTotal > 0 || u.shiftDebt > 0 || u.role === Role.STAFF) // Show all staff or anyone with activity
    .sort((a, b) => b.shiftTotal - a.shiftTotal);

    // Filter to only actual STAFF roles for the "Active Staff" count
    const activeStaffCount = relevantUsers.filter(u => u.role === Role.STAFF).length;

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
        games: slotGames,
        timestamp: slotStart.getTime()
      });
    }

    return { 
      totalRevenue, 
      totalGames, 
      dailyIncome, 
      dailyCount: dailySettledTransactions.length, 
      hourlyData, 
      staffShiftCollections, 
      activeStaffCount,
      maxRevenueInShift, 
      currentShiftTransactions: dailyTransactions, 
      totalDebtAmount 
    };
  }, [transactions, users, selectedDate, currentUser, settings.pricePerGame]);

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
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const formatValue = (val: number) => val.toLocaleString() + " IQD";
  const isRTL = settings.language === 'ckb';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className={`flex flex-col xl:flex-row items-center justify-between gap-4 p-6 bg-slate-800 border border-slate-700 rounded-[2rem] shadow-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
           <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400"><Calendar size={24} /></div>
           <h3 className="text-lg font-black text-white">{t.dashboard}</h3>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold text-sm focus:outline-none" />
           <button onClick={handleCopyReport} className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-xl font-bold text-xs">
              {copySuccess ? t.reportCopied : t.copyReport}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<TrendingUp className="text-emerald-500" />} label={t.dailyIncome} value={formatValue(stats.dailyIncome)} subtext="Shift 08:00 - 08:00" />
        <StatCard icon={<UserMinus className="text-rose-500" />} label={t.totalDebt} value={formatValue(stats.totalDebtAmount)} subtext="" />
        <StatCard icon={<Gamepad2 className="text-purple-500" />} label={t.completedGames} value={stats.dailyCount.toString()} subtext="" />
        <StatCard icon={<Users className="text-orange-500" />} label={t.activeStaff} value={stats.activeStaffCount.toString()} subtext="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-[2rem] shadow-lg h-[320px] flex flex-col">
          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6">{t.revenueByStaff}</h4>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {stats.staffShiftCollections.map((item, idx) => {
              const maxVal = stats.staffShiftCollections[0]?.shiftTotal || 1;
              return (
                <div key={idx} className="space-y-2">
                  <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-black text-slate-200">{item.username}</span>
                    <span className="text-xs font-black text-emerald-400">{formatValue(item.shiftTotal)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(item.shiftTotal / maxVal) * 100}%` }}></div>
                  </div>
                </div>
              );
            })}
            {stats.staffShiftCollections.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">No active staff for this period.</div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-6 rounded-[2rem] shadow-lg h-[320px] flex flex-col">
           <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6">{t.hourlyReport}</h4>
           <div className="flex-1 flex items-end justify-between gap-1">
              {stats.hourlyData.filter((_, i) => i % 2 === 0).map((hour, idx) => {
                const fill = stats.maxRevenueInShift > 0 ? (hour.revenue / stats.maxRevenueInShift) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-slate-900 rounded-t-md relative overflow-hidden" style={{ height: '140px' }}>
                       <div className="absolute bottom-0 left-0 w-full bg-blue-600 transition-all duration-1000" style={{ height: `${Math.max(2, fill)}%` }}></div>
                    </div>
                    <span className="text-[8px] font-black text-slate-500 mt-2">{hour.label.split(':')[0]}</span>
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) => (
  <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-sm">
    <div className="bg-slate-900/50 p-3 rounded-xl w-fit mb-4">{icon}</div>
    <h5 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</h5>
    <p className="text-xl font-black text-white">{value}</p>
    {subtext && <p className="text-[9px] text-slate-500 mt-2">{subtext}</p>}
  </div>
);

export default Dashboard;

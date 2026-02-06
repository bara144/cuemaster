
import React, { useMemo, useState, useRef } from 'react';
import { Transaction, User, PaymentMethod, MarketOrder, Role } from '../types';
import { Banknote, Percent, Search, UserMinus, CheckCircle2, Clock, User as UserIcon, ChevronDown, ChevronUp, Calendar, Gamepad2, FileText, X, Filter, Users, LayoutGrid, Trash2, AlertTriangle, ShoppingBasket, Coffee, DollarSign, ListTree } from 'lucide-react';

interface HistoryViewProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  users: User[];
  isAdmin: boolean;
  currentUser: User;
  t: any;
}

const HistoryView: React.FC<HistoryViewProps> = ({ transactions, setTransactions, users, isAdmin, currentUser, t }) => {
  const [filter, setFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [expandedTimings, setExpandedTimings] = useState<Record<string, boolean>>({});
  const [selectedNote, setSelectedNote] = useState<{ playerName: string, note: string } | null>(null);
  const [selectedMarketItems, setSelectedMarketItems] = useState<{ playerName: string, items: MarketOrder[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const getDefaultStartDate = () => {
    const now = new Date();
    const start = new Date(now);
    if (now.getHours() < 8) {
      start.setDate(start.getDate() - 1);
    }
    start.setHours(8, 0, 0, 0);
    return start.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const visibleUsers = useMemo(() => {
    return users.filter(u => u.hallId === currentUser.hallId);
  }, [users, currentUser.hallId]);

  const filteredTransactions = useMemo(() => {
    const startLimit = new Date(startDate);
    startLimit.setHours(8, 0, 0, 0);
    
    const endLimit = new Date(endDate);
    endLimit.setHours(8, 0, 0, 0);
    endLimit.setDate(endLimit.getDate() + 1);

    return transactions
      .filter(tr => {
        const matchName = tr.playerName.toLowerCase().includes(filter.toLowerCase());
        const matchDate = tr.timestamp >= startLimit.getTime() && tr.timestamp < endLimit.getTime();
        const matchStaff = staffFilter === 'ALL' || tr.collectedBy === staffFilter;
        const matchMethod = methodFilter === 'ALL' || tr.paymentMethod === methodFilter;
        
        return matchName && matchDate && matchStaff && matchMethod;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, filter, startDate, endDate, staffFilter, methodFilter]);

  const totalFilteredRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, tr) => acc + tr.totalPaid, 0);
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString() + " IQD";
  };

  const getStaffInfo = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? { username: user.username, id: user.id } : { username: 'Unknown', id: 'unknown' };
  };

  const toggleTimings = (id: string) => {
    setExpandedTimings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    setTransactions(prev => prev.filter(t => t.id !== confirmDelete.id));
    setConfirmDelete(null);
    setSwipedId(null);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    if (!isAdmin) return;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (!isAdmin || !touchStartRef.current) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStartRef.current - currentX;
    if (Math.abs(diff) > 70) {
      setSwipedId(id);
    } else if (Math.abs(diff) < 20) {
      if (swipedId === id) setSwipedId(null);
    }
  };

  const getStaffColor = (name: string) => {
    const colors = [
      'bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 
      'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 
      'bg-cyan-500', 'bg-orange-500', 'bg-lime-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const isRTL = t.appName === "بیگ بۆس";

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-[2rem] p-6 md:p-8 shadow-lg space-y-6">
        <div className={`flex flex-col lg:flex-row gap-6 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
          <div className="flex-1">
            <label className={`block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ${isRTL ? 'text-right' : ''}`}>
              {t.searchPlayers}
            </label>
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
              <input 
                type="text" 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white w-full focus:outline-none focus:border-emerald-500 transition-colors font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                placeholder="..."
              />
            </div>
          </div>

          <div className={`flex flex-col sm:flex-row gap-4 flex-2 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <label className={`block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ${isRTL ? 'text-right' : ''}`}>
                {t.startDate}
              </label>
              <div className="relative">
                <Calendar className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={16} />
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white w-full focus:outline-none focus:border-emerald-500 transition-colors appearance-none font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 ${isRTL ? 'text-right' : ''}`}>
                {t.endDate}
              </label>
              <div className="relative">
                <Calendar className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={16} />
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white w-full focus:outline-none focus:border-emerald-500 transition-colors appearance-none font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-700/50 ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="space-y-3">
             <label className={`flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
               <Users size={14} /> {t.collectedBy}
             </label>
             <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setStaffFilter('ALL')} className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${staffFilter === 'ALL' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {isRTL ? 'هەموو' : 'All'}
                </button>
                {visibleUsers.map(user => (
                  <button key={user.id} onClick={() => setStaffFilter(user.id)} className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${staffFilter === user.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                    <div className={`w-4 h-4 rounded-full ${getStaffColor(user.username)} text-[8px] flex items-center justify-center text-white`}>{user.username[0].toUpperCase()}</div>
                    {user.username}
                  </button>
                ))}
             </div>
          </div>
          <div className="space-y-3">
             <label className={`flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
               <Filter size={14} /> {t.method}
             </label>
             <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setMethodFilter('ALL')} className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${methodFilter === 'ALL' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  {isRTL ? 'هەموو' : 'All'}
                </button>
                <button onClick={() => setMethodFilter('CASH')} className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${methodFilter === 'CASH' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Banknote size={14} /> {t.cash}
                </button>
                <button onClick={() => setMethodFilter('CREDIT')} className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${methodFilter === 'CREDIT' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <Percent size={14} /> {t.credit}
                </button>
                <button onClick={() => setMethodFilter('DEBT')} className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${methodFilter === 'DEBT' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                  <UserMinus size={14} /> {t.debt}
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20 shadow-inner ${isRTL ? 'flex-row-reverse' : ''}`}>
         <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
               <DollarSign size={20} />
            </div>
            <div>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{isRTL ? 'کۆی گشتی پارەی وەرگیراو' : 'Total Filtered Revenue'}</p>
               <h4 className="text-xl font-black text-white">{formatCurrency(totalFilteredRevenue)}</h4>
            </div>
         </div>
         <div className={`flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ListTree size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-400">{filteredTransactions.length} {isRTL ? 'تۆمار' : 'Records'}</span>
         </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700">
                <th className={`px-6 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.player}</th>
                <th className="px-6 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">{t.gamesPlayed}</th>
                <th className={`px-6 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.gameTimings}</th>
                <th className={`px-6 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.collectedBy}</th>
                <th className={`px-6 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.method}</th>
                <th className={`px-6 py-6 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-left' : 'text-right'}`}>{t.totalPaid}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 italic">No records.</td>
                </tr>
              ) : filteredTransactions.map(tData => {
                const staff = getStaffInfo(tData.collectedBy);
                const staffColor = getStaffColor(staff.username);
                const gameCount = tData.gameStartTimes ? tData.gameStartTimes.length : 0;
                const hasMultipleGames = gameCount > 1;
                const isExpanded = expandedTimings[tData.id];
                const isSwiped = swipedId === tData.id;
                const hasMarket = tData.marketItems && tData.marketItems.length > 0;
                const isUnderpaid = tData.totalPaid < tData.expectedTotal;
                const isSettledDebt = tData.paymentMethod === 'DEBT' && tData.isSettled;

                return (
                  <tr key={tData.id} onTouchStart={(e) => handleTouchStart(e, tData.id)} onTouchMove={(e) => handleTouchMove(e, tData.id)} className={`hover:bg-slate-700/20 transition-all align-top relative ${isSwiped ? (isRTL ? 'translate-x-12' : '-translate-x-12') : ''} ${isUnderpaid && !isSettledDebt ? 'bg-rose-500/5' : ''}`}>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className="font-black text-white text-base">{tData.playerName}</div>
                        {isUnderpaid && !isSettledDebt && (
                          <div className="bg-rose-600 p-1 rounded-lg text-white"><AlertTriangle size={14} /></div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1.5 uppercase font-bold tracking-tight">
                        {new Date(tData.timestamp).toLocaleDateString()} {new Date(tData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-xl font-black text-base min-w-[45px]">
                        {isSettledDebt ? 0 : gameCount}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      {!isSettledDebt ? (
                        <div className="flex flex-col gap-2 min-w-[160px]">
                          {!isExpanded ? (
                            <button onClick={() => hasMultipleGames && toggleTimings(tData.id)} className={`flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-xl border border-slate-700/50 transition-all text-[11px] group ${hasMultipleGames ? 'hover:border-emerald-500/50' : 'cursor-default'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Clock size={12} className="text-emerald-500" />
                              <span className="text-slate-200 font-mono font-bold">{tData.gameStartTimes && tData.gameStartTimes.length > 0 ? new Date(tData.gameStartTimes[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                              {tData.gameTables && tData.gameTables[0] > 0 && <span className="text-blue-400 font-black text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">M{tData.gameTables[0]}</span>}
                              {hasMultipleGames && <div className={`flex items-center gap-1 ml-auto text-emerald-500 font-black bg-emerald-500/10 px-2 rounded-full text-[10px] ${isRTL ? 'mr-auto ml-0' : ''}`}><span>+{tData.gameStartTimes.length - 1}</span><ChevronDown size={12} /></div>}
                            </button>
                          ) : (
                            <div className="flex flex-col gap-1.5 bg-slate-900/80 p-2.5 rounded-2xl border border-emerald-500/30">
                              <button onClick={() => toggleTimings(tData.id)} className={`flex items-center justify-between w-full text-[10px] font-black text-emerald-400 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}><span>{tData.gameStartTimes.length} {t.gamesPlayed}</span><ChevronUp size={14} /></button>
                              <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                {tData.gameStartTimes.map((time, idx) => (
                                  <div key={idx} className={`flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-[10px] font-mono font-bold ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-emerald-500">#{idx + 1}</span>
                                    <span className="text-slate-300">{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div className="flex items-center gap-1 ml-auto text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"><LayoutGrid size={10} /><span>M{tData.gameTables?.[idx] || '?'}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : <div className="text-[10px] text-slate-600 italic">N/A</div>}
                    </td>
                    <td className="px-6 py-6">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl ${staffColor} flex items-center justify-center text-white text-sm font-black`}>{staff.username[0].toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-black text-slate-200 block truncate">{staff.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {tData.paymentMethod === 'CASH' && <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-400/20"><Banknote size={12} /> {t.cash}</div>}
                          {tData.paymentMethod === 'CREDIT' && <div className="flex items-center gap-2 text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-400/20"><Percent size={12} /> {t.credit}</div>}
                          {tData.paymentMethod === 'DEBT' && <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border shadow-inner ${tData.isSettled ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>{tData.isSettled ? <CheckCircle2 size={12} /> : <UserMinus size={12} />}{isSettledDebt ? (tData.isPartialSettlement ? (isRTL ? 'قەرز (بەشێکی دراوە)' : 'Debt (Partial)') : (isRTL ? 'قەرز (دراوە)' : 'Debt (Settled)')) : t.debt}</div>}
                          {hasMarket && !isSettledDebt && <button onClick={() => setSelectedMarketItems({ playerName: tData.playerName, items: tData.marketItems })} className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all relative"><ShoppingBasket size={14} /><span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-900">{tData.marketItems.length}</span></button>}
                          {tData.note && <button onClick={() => setSelectedNote({ playerName: tData.playerName, note: tData.note! })} className="p-2 bg-slate-900 rounded-xl border border-slate-700 text-indigo-400 hover:text-indigo-300 transition-all shadow-lg"><FileText size={14} /></button>}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-6 ${isRTL ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-xl font-black ${isUnderpaid && !isSettledDebt ? 'text-rose-500' : 'text-white'}`}>{formatCurrency(tData.totalPaid)}</span>
                        {isAdmin && (
                          <button onClick={() => setConfirmDelete(tData)} className={`p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all ${isSwiped ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none md:opacity-0 md:group-hover:opacity-100 md:scale-100'}`}><Trash2 size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Modal */}
      {selectedMarketItems && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
           <div className="bg-slate-800 w-full max-w-md rounded-[2.5rem] border border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className={`p-6 border-b border-slate-700 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <ShoppingBasket size={24} className="text-amber-500" />
                  <div><h3 className="font-black text-white">{isRTL ? 'وردەکاری مارکێت' : 'Market Details'}</h3><p className="text-[10px] text-slate-500 font-bold uppercase">{selectedMarketItems.playerName}</p></div>
                </div>
                <button onClick={() => setSelectedMarketItems(null)} className="text-slate-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {selectedMarketItems.items.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}><span className="text-white font-black">{item.name}</span><br/><span className="text-[10px] text-slate-500">{formatCurrency(item.price)}</span></div>
                    <div className="text-right"><div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-black">x{item.quantity}</div><span className="text-xs font-black text-slate-300">{formatCurrency(item.price * item.quantity)}</span></div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-900/40 border-t border-slate-700">
                <button onClick={() => setSelectedMarketItems(null)} className="w-full py-4 bg-slate-700 text-white font-black rounded-2xl">{t.confirmAction || 'Close'}</button>
              </div>
           </div>
        </div>
      )}

      {/* Note Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-md rounded-[2rem] border border-indigo-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-5 border-b border-slate-700 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><FileText size={20} className="text-indigo-400" /><h3 className="font-black text-white">{t.note} - {selectedNote.playerName}</h3></div>
              <button onClick={() => setSelectedNote(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-8">
              <div className={`bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 text-slate-200 leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{selectedNote.note}</div>
              <button onClick={() => setSelectedNote(null)} className="w-full mt-8 py-4 bg-slate-700 text-white font-black rounded-2xl">{t.confirmAction || 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
           <div className="bg-slate-800 w-full max-w-md rounded-[2.5rem] border border-rose-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={40} /></div>
                 <div><h3 className="text-2xl font-black text-white">{t.confirmAction}</h3><p className="text-slate-400 text-sm mt-2">{isRTL ? 'ئایا دڵنیایت لە سڕینەوە؟' : 'Are you sure you want to delete this?'}</p></div>
                 <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button onClick={() => setConfirmDelete(null)} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-2xl">{t.cancel}</button>
                    <button onClick={handleDelete} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl">{t.remove}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;

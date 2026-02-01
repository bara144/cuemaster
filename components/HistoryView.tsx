
import React, { useMemo, useState, useRef } from 'react';
import { Transaction, User, PaymentMethod, MarketOrder, Role } from '../types';
import { Banknote, Percent, Search, UserMinus, CheckCircle2, Clock, User as UserIcon, ChevronDown, ChevronUp, Calendar, Gamepad2, FileText, X, Filter, Users, LayoutGrid, Trash2, AlertTriangle, ShoppingBasket, Coffee } from 'lucide-react';

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
  
  // Swipe logic
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

  // Filter users to only those in the current user's hall
  const visibleUsers = useMemo(() => {
    return users.filter(u => u.hallId === currentUser.hallId);
  }, [users, currentUser.hallId]);

  const filteredTransactions = useMemo(() => {
    const startLimit = new Date(startDate);
    startLimit.setHours(8, 0, 0, 0);
    
    const endLimit = new Date(endDate);
    endLimit.setHours(8, 0, 0, 0);
    endLimit.setDate(endLimit.getDate() + 1);

    return transactions.filter(tr => {
      const matchName = tr.playerName.toLowerCase().includes(filter.toLowerCase());
      const matchDate = tr.timestamp >= startLimit.getTime() && tr.timestamp < endLimit.getTime();
      const matchStaff = staffFilter === 'ALL' || tr.collectedBy === staffFilter;
      const matchMethod = methodFilter === 'ALL' || tr.paymentMethod === methodFilter;
      
      return matchName && matchDate && matchStaff && matchMethod;
    });
  }, [transactions, filter, startDate, endDate, staffFilter, methodFilter]);

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

    // Threshold for swipe
    if (Math.abs(diff) > 70) {
      setSwipedId(id);
    } else if (Math.abs(diff) < 20) {
      // Small movement resets if swiped
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
      {/* Enhanced Filters Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-[2rem] p-6 md:p-8 shadow-lg space-y-6">
        <div className={`flex flex-col lg:flex-row gap-6 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
          {/* Search */}
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

          {/* Date Range Selection */}
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
                <button 
                  onClick={() => setStaffFilter('ALL')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${staffFilter === 'ALL' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {isRTL ? 'هەموو' : 'All'}
                </button>
                {visibleUsers.map(user => (
                  <button 
                    key={user.id}
                    onClick={() => setStaffFilter(user.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${staffFilter === user.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className={`w-4 h-4 rounded-full ${getStaffColor(user.username)} text-[8px] flex items-center justify-center text-white`}>
                      {user.username[0].toUpperCase()}
                    </div>
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
                <button 
                  onClick={() => setMethodFilter('ALL')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${methodFilter === 'ALL' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {isRTL ? 'هەموو' : 'All'}
                </button>
                <button 
                  onClick={() => setMethodFilter('CASH')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${methodFilter === 'CASH' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500/30'}`}
                >
                  <Banknote size={14} /> {t.cash}
                </button>
                <button 
                  onClick={() => setMethodFilter('CREDIT')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${methodFilter === 'CREDIT' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-blue-500/30'}`}
                >
                  <Percent size={14} /> {t.credit}
                </button>
                <button 
                  onClick={() => setMethodFilter('DEBT')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${methodFilter === 'DEBT' ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-amber-500/30'}`}
                >
                  <UserMinus size={14} /> {t.debt}
                </button>
             </div>
          </div>
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
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 italic">No transactions found for the selected criteria.</td>
                </tr>
              ) : filteredTransactions.map(tData => {
                const staff = getStaffInfo(tData.collectedBy);
                const staffColor = getStaffColor(staff.username);
                const gameCount = tData.gameStartTimes ? tData.gameStartTimes.length : 0;
                const hasMultipleGames = gameCount > 1;
                const isExpanded = expandedTimings[tData.id];
                const isSwiped = swipedId === tData.id;
                const hasMarket = tData.marketItems && tData.marketItems.length > 0;
                
                return (
                  <tr 
                    key={tData.id} 
                    onTouchStart={(e) => handleTouchStart(e, tData.id)}
                    onTouchMove={(e) => handleTouchMove(e, tData.id)}
                    className={`hover:bg-slate-700/20 transition-all align-top relative ${isSwiped ? (isRTL ? 'translate-x-12' : '-translate-x-12') : ''}`}
                  >
                    <td className="px-6 py-6">
                      <div className="font-black text-white text-base">{tData.playerName}</div>
                      <div className="text-[10px] text-slate-500 mt-1.5 uppercase font-bold tracking-tight">
                        {new Date(tData.timestamp).toLocaleDateString()} {new Date(tData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-1.5 rounded-xl font-black text-base min-w-[45px] shadow-inner">
                        {gameCount}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        {!isExpanded ? (
                          <button 
                            onClick={() => hasMultipleGames && toggleTimings(tData.id)}
                            className={`flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-xl border border-slate-700/50 transition-all text-[11px] group ${hasMultipleGames ? 'hover:border-emerald-500/50 hover:bg-slate-800' : 'cursor-not-allowed'} ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Clock size={12} className="text-emerald-500" />
                            <span className="text-slate-200 font-mono font-bold">
                              {tData.gameStartTimes && tData.gameStartTimes.length > 0 
                                ? new Date(tData.gameStartTimes[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'N/A'}
                            </span>
                            {tData.gameTables && tData.gameTables[0] > 0 && (
                              <span className="text-blue-400 font-black text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                M{tData.gameTables[0]}
                              </span>
                            )}
                            {hasMultipleGames && (
                              <div className={`flex items-center gap-1 ml-auto text-emerald-500 font-black bg-emerald-500/10 px-2 rounded-full text-[10px] ${isRTL ? 'mr-auto ml-0' : ''}`}>
                                <span>+{tData.gameStartTimes.length - 1}</span>
                                <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />
                              </div>
                            )}
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1.5 bg-slate-900/80 p-2.5 rounded-2xl border border-emerald-500/30 shadow-xl">
                            <button 
                              onClick={() => toggleTimings(tData.id)}
                              className={`flex items-center justify-between w-full text-[10px] font-black text-emerald-400 mb-1 hover:text-emerald-300 ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                              <span>{tData.gameStartTimes.length} {t.gamesPlayed}</span>
                              <ChevronUp size={14} />
                            </button>
                            <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                              {tData.gameStartTimes.map((time, idx) => (
                                <div key={idx} className={`flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-[10px] font-mono font-bold ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-emerald-500">#{idx + 1}</span>
                                  <span className="text-slate-300">
                                    {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <div className="flex items-center gap-1 ml-auto text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                     <LayoutGrid size={10} />
                                     <span>M{tData.gameTables?.[idx] || '?'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl ${staffColor} flex items-center justify-center text-white text-sm font-black shadow-lg shadow-black/20`}>
                          {staff.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-black text-slate-200 block truncate">{staff.username}</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-tighter font-bold">Verified Staff</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {tData.paymentMethod === 'CASH' && (
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-400/20 shadow-inner">
                              <Banknote size={12} /> {t.cash}
                            </div>
                          )}
                          {tData.paymentMethod === 'CREDIT' && (
                            <div className="flex items-center gap-2 text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-400/20 shadow-inner">
                              <Percent size={12} /> {t.credit}
                            </div>
                          )}
                          {tData.paymentMethod === 'DEBT' && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border shadow-inner ${tData.isSettled ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                              {tData.isSettled ? <CheckCircle2 size={12} /> : <UserMinus size={12} />}
                              {t.debt} {tData.isSettled && `(${t.settled})`}
                            </div>
                          )}

                          {hasMarket && (
                            <button 
                              onClick={() => setSelectedMarketItems({ playerName: tData.playerName, items: tData.marketItems })}
                              className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center shadow-lg relative group/market"
                              title={t.market}
                            >
                              <ShoppingBasket size={14} />
                              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-900 group-hover/market:scale-110 transition-transform">
                                {tData.marketItems.length}
                              </span>
                            </button>
                          )}

                          {tData.note && (
                            <button 
                              onClick={() => setSelectedNote({ playerName: tData.playerName, note: tData.note! })}
                              className="p-2 bg-slate-900 rounded-xl border border-slate-700 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50 transition-all flex items-center justify-center shadow-lg"
                              title={t.note}
                            >
                              <FileText size={14} />
                            </button>
                          )}
                        </div>
                        {tData.discount > 0 && (
                          <span className="text-rose-400 text-[10px] font-black px-1.5">
                            -{formatCurrency(tData.discount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-6 ${isRTL ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xl font-black text-white">{formatCurrency(tData.totalPaid)}</span>
                        {isAdmin && (
                          <button 
                            onClick={() => setConfirmDelete(tData)}
                            className={`p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all ${isSwiped ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none md:opacity-0 md:group-hover:opacity-100 md:scale-100'}`}
                          >
                            <Trash2 size={18} />
                          </button>
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

      {/* Market Items Breakdown Modal */}
      {selectedMarketItems && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-slate-800 w-full max-w-md rounded-[2.5rem] border border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className={`p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <ShoppingBasket size={24} className="text-amber-500" />
                  <div>
                    <h3 className="font-black text-white">{isRTL ? 'وردەکاری مارکێت' : 'Market Details'}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedMarketItems.playerName}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMarketItems(null)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {selectedMarketItems.items.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex flex-col ${isRTL ? 'text-right' : ''}`}>
                       <span className="text-white font-black">{item.name}</span>
                       <span className="text-[10px] text-slate-500 font-bold uppercase">{formatCurrency(item.price)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-black border border-amber-500/20">
                          x{item.quantity}
                       </div>
                       <span className="text-xs font-black text-slate-300 mt-1">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-900/40 border-t border-slate-700">
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <span className="text-sm font-black text-slate-500 uppercase">{t.marketTotal}:</span>
                   <span className="text-2xl font-black text-amber-500">
                    {formatCurrency(selectedMarketItems.items.reduce((sum, i) => sum + (i.price * i.quantity), 0))}
                   </span>
                </div>
                <button 
                  onClick={() => setSelectedMarketItems(null)}
                  className="w-full mt-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95"
                >
                  {t.confirmAction || 'Close'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-slate-800 w-full max-w-md rounded-[2.5rem] border border-rose-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <AlertTriangle size={40} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-white">{t.confirmAction}</h3>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      {isRTL 
                        ? 'ئایا دڵنیایت لە سڕینەوەی ئەم پارەدانە؟ ئەم کارە ناتوانرێت بگەڕێندرێتەوە و کار دەکاتە سەر کۆی داهات.' 
                        : 'Are you sure you want to delete this transaction? This action is permanent and will affect revenue totals.'}
                    </p>
                 </div>
                 
                 <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-2xl">
                    <div className={`flex justify-between items-center text-xs font-bold ${isRTL ? 'flex-row-reverse' : ''}`}>
                       <span className="text-slate-500 uppercase tracking-widest">{t.player}</span>
                       <span className="text-white">{confirmDelete.playerName}</span>
                    </div>
                    <div className={`flex justify-between items-center text-xs font-bold mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                       <span className="text-slate-500 uppercase tracking-widest">{t.totalPaid}</span>
                       <span className="text-emerald-400">{formatCurrency(confirmDelete.totalPaid)}</span>
                    </div>
                 </div>

                 <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button 
                      onClick={() => { setConfirmDelete(null); setSwipedId(null); }}
                      className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all active:scale-95"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                    >
                      {t.remove}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Note Display Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 w-full max-w-md rounded-[2rem] border border-indigo-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileText size={20} className="text-indigo-400" />
                <h3 className="font-black text-white">{t.note} - {selectedNote.playerName}</h3>
              </div>
              <button onClick={() => setSelectedNote(null)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className={`bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 text-slate-200 leading-relaxed whitespace-pre-wrap font-medium shadow-inner ${isRTL ? 'text-right' : ''}`}>
                {selectedNote.note}
              </div>
              <button 
                onClick={() => setSelectedNote(null)}
                className="w-full mt-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95"
              >
                {t.confirmAction || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;

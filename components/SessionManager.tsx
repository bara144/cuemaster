
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Session, Transaction, AppSettings, User, PaymentMethod, Role, MarketOrder } from '../types';
import { Plus, X, Clock, Calculator, Percent, Banknote, UserPlus, UserCheck, AlertCircle, PlayCircle, Lock, UserMinus, FileText, ChevronRight, ChevronLeft, Users, ChevronDown, ChevronUp, CheckCircle2, LayoutGrid, Search, Info, Coffee, ShoppingCart, Minus, AlertTriangle, ShieldAlert, Edit3 } from 'lucide-react';

interface SessionManagerProps {
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  currentUser: User;
  players: string[];
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  t: any;
}

const SessionManager: React.FC<SessionManagerProps> = ({ 
  sessions, 
  setSessions, 
  setTransactions, 
  settings, 
  currentUser, 
  players, 
  setPlayers, 
  t 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickSelectOpen, setIsQuickSelectOpen] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ session: Session, method: PaymentMethod } | null>(null);
  const [pendingTableSelect, setPendingTableSelect] = useState<{ sessionId: string, delta: number } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [customPrice, setCustomPrice] = useState(settings.pricePerGame);
  const [error, setError] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [actualPaidAmount, setActualPaidAmount] = useState<number>(0);
  const [showManualPriceInput, setShowManualPriceInput] = useState(false);
  
  const [marketModalSessionId, setMarketModalSessionId] = useState<string | null>(null);

  const currentMarketSession = useMemo(() => {
    return sessions.find(s => s.id === marketModalSessionId) || null;
  }, [sessions, marketModalSessionId]);

  const [showTimingsId, setShowTimingsId] = useState<string | null>(null);

  const isAdmin = currentUser.role === Role.ADMIN;
  const isDark = settings.theme === 'dark';
  const isRTL = settings.language === 'ckb';

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aHasMarket = Array.isArray(a.marketItems) && a.marketItems.length > 0;
      const bHasMarket = Array.isArray(b.marketItems) && b.marketItems.length > 0;
      
      const aActive = a.gamesPlayed > 0 || aHasMarket;
      const bActive = b.gamesPlayed > 0 || bHasMarket;

      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      if (aActive && bActive) {
        const aFirst = a.gameStartTimes[0] || a.startTime;
        const bFirst = b.gameStartTimes[0] || b.startTime;
        return aFirst - bFirst;
      }
      return b.startTime - a.startTime;
    });
  }, [sessions]);

  const filteredQuickPlayers = useMemo(() => {
    return players.filter(p => p.toLowerCase().includes(playerSearchTerm.toLowerCase()));
  }, [players, playerSearchTerm]);

  useEffect(() => {
    if (isModalOpen) {
      setCustomPrice(settings.pricePerGame);
      setError('');
    }
  }, [isModalOpen, settings.pricePerGame]);

  const startSessionForPlayer = (name: string, price?: number) => {
    if (sessions.some(s => s.playerName === name)) {
      setError(t.alreadyActive);
      return;
    }

    const newSession: Session = {
      id: Math.random().toString(36).substr(2, 9),
      playerName: name,
      startTime: Date.now(),
      gameStartTimes: [], 
      gameTables: [],
      gamesPlayed: 0,
      pricePerGame: price || settings.pricePerGame,
      isActive: true,
      tableNumber: 0,
      marketItems: []
    };
    setSessions([newSession, ...sessions]);
    setIsModalOpen(false);
    setIsQuickSelectOpen(false);
    setPlayerSearchTerm('');
    setError('');
  };

  const handleAddNewPlayer = () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) return;
    if (!players.includes(trimmedName)) {
      setPlayers(prev => [...prev, trimmedName]);
    }
    startSessionForPlayer(trimmedName, customPrice);
    setNewPlayerName('');
  };

  const calculateTieredDiscount = (games: number, gameAmount: number): number => {
    if (games < 4 || gameAmount < 3000) return 0;
    const tiers = settings.discountTiers || {};
    const gameCounts = Object.keys(tiers).map(Number).sort((a, b) => b - a);
    for (const count of gameCounts) {
      if (games >= count) return tiers[count];
    }
    return 0;
  };

  const calculateMarketTotal = (items: MarketOrder[]) => {
    return items ? items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
  };

  const initiatePayment = (session: Session, method: PaymentMethod) => {
    const gameAmount = session.gamesPlayed * session.pricePerGame;
    const marketTotal = calculateMarketTotal(session.marketItems);
    const discount = method === 'CREDIT' ? calculateTieredDiscount(session.gamesPlayed, gameAmount) : 0;
    const expected = Math.max(0, gameAmount + marketTotal - discount);
    
    setPendingPayment({ session, method });
    setActualPaidAmount(expected);
    setPaymentNote('');
    setShowManualPriceInput(false);
  };

  const finalizePayment = () => {
    if (!pendingPayment) return;
    const { session, method } = pendingPayment;

    const gameAmount = session.gamesPlayed * session.pricePerGame;
    const marketTotal = calculateMarketTotal(session.marketItems);
    const discount = method === 'CREDIT' ? calculateTieredDiscount(session.gamesPlayed, gameAmount) : 0;
    const expectedTotal = Math.max(0, gameAmount + marketTotal - discount);

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: session.id,
      playerName: session.playerName,
      amount: gameAmount,
      discount: discount,
      marketTotal: marketTotal,
      expectedTotal: expectedTotal,
      totalPaid: actualPaidAmount,
      paymentMethod: method,
      timestamp: Date.now(),
      gameStartTimes: [...session.gameStartTimes],
      gameTables: [...session.gameTables],
      collectedBy: currentUser.id,
      marketItems: [...session.marketItems],
      isSettled: method !== 'DEBT',
      note: paymentNote.trim() || ""
    };

    setTransactions(prev => [transaction, ...prev]);
    setSessions(prev => prev.map(s => 
      s.id === session.id 
        ? { ...s, gamesPlayed: 0, startTime: Date.now(), gameStartTimes: [], gameTables: [], marketItems: [] } 
        : s
    ));
    setPendingPayment(null);
    setSelectedSession(null);
    setPaymentNote('');
  };

  const updateMarketItem = (sessionId: string, itemName: string, delta: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        let newMarketItems = Array.isArray(s.marketItems) ? [...s.marketItems] : [];
        const existingItemIndex = newMarketItems.findIndex(i => i.name === itemName);

        if (existingItemIndex > -1) {
          const newQty = newMarketItems[existingItemIndex].quantity + delta;
          if (newQty <= 0) {
            newMarketItems.splice(existingItemIndex, 1);
          } else {
            newMarketItems[existingItemIndex] = { ...newMarketItems[existingItemIndex], quantity: newQty };
          }
        } else if (delta > 0) {
          const itemDef = (settings.marketItems || []).find(mi => mi.name === itemName);
          if (itemDef) {
            newMarketItems.push({ name: itemName, price: itemDef.price, quantity: delta });
          }
        }
        return { ...s, marketItems: newMarketItems };
      }
      return s;
    }));
  };

  const requestTableSelection = (id: string, delta: number) => {
    if (delta > 0) {
      setPendingTableSelect({ sessionId: id, delta });
    } else {
      updateGames(id, delta, 0);
    }
  };

  const updateGames = (id: string, delta: number, tableNum: number) => {
    if (delta < 0 && !isAdmin) return;
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        const newCount = Math.max(0, s.gamesPlayed + delta);
        let newTimings = [...s.gameStartTimes];
        let newTables = [...(s.gameTables || [])];
        
        if (delta > 0) {
          newTimings.push(Date.now());
          newTables.push(tableNum);
        } else if (delta < 0 && newTimings.length > 0) {
          newTimings.pop();
          newTables.pop();
        }
        return { ...s, gamesPlayed: newCount, gameStartTimes: newTimings, gameTables: newTables };
      }
      return s;
    }));
    setPendingTableSelect(null);
  };

  const removeSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const marketCount = Array.isArray(session.marketItems) ? session.marketItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
    if (isAdmin || (session.gamesPlayed === 0 && marketCount === 0)) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString() + " IQD";

  const availableTables = useMemo(() => {
    return Array.from({ length: settings.tableCount }, (_, i) => i + 1);
  }, [settings.tableCount]);

  return (
    <div className="space-y-6">
      {/* Selection Header */}
      <div className={`flex flex-col gap-4 p-4 md:p-6 rounded-[2rem] border transition-all duration-500 shadow-xl ${isDark ? 'bg-slate-800 border-slate-700 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex flex-col ${isRTL ? 'text-right' : ''}`}>
             <h3 className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.activeSessions}</h3>
             <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-1">Management Console</p>
          </div>

          <div className={`flex items-center gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button 
              onClick={() => {
                setIsQuickSelectOpen(!isQuickSelectOpen);
                setPlayerSearchTerm('');
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all border shadow-md group active:scale-95 ${
                isQuickSelectOpen 
                ? (isDark ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white')
                : (isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600')
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Users size={18} />
              <span className="text-xs md:text-sm hidden sm:inline">{isQuickSelectOpen ? t.cancel : t.playersDirectory}</span>
              {isQuickSelectOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div className={`w-px h-8 hidden sm:block ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Plus size={18} /> <span className="text-xs md:text-sm">{t.newSession}</span>
            </button>
          </div>
        </div>

        {isQuickSelectOpen && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-4 border-t border-slate-700/30 space-y-4">
            <div className="relative max-w-md mx-auto">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={16} />
              <input 
                type="text" 
                value={playerSearchTerm}
                onChange={(e) => setPlayerSearchTerm(e.target.value)}
                placeholder={t.searchPlayers}
                className={`w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-medium ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
              />
              {playerSearchTerm && (
                <button 
                  onClick={() => setPlayerSearchTerm('')}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 transition-colors ${isRTL ? 'left-2' : 'right-2'}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              {filteredQuickPlayers.length > 0 ? (
                filteredQuickPlayers.map((player) => {
                  const isActive = sessions.some(s => s.playerName === player);
                  return (
                    <button
                      key={player}
                      onClick={() => startSessionForPlayer(player)}
                      disabled={isActive}
                      className={`p-4 rounded-2xl text-sm font-black border transition-all flex flex-col items-center justify-center gap-2 shadow-sm relative overflow-hidden group ${
                        isActive
                          ? (isDark ? 'bg-slate-900/50 border-slate-800 text-slate-600 opacity-40' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-40')
                          : (isDark ? 'bg-slate-700/40 border-slate-600 text-slate-100 hover:border-emerald-500 hover:bg-emerald-500/10' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50')
                      }`}
                    >
                      <span className="truncate w-full text-center">{player}</span>
                      <div className={`w-6 h-1 rounded-full ${isActive ? 'bg-slate-700' : 'bg-emerald-500 group-hover:w-10 transition-all'}`}></div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-slate-500 italic flex flex-col items-center gap-2">
                  <Users size={32} className="opacity-20" />
                  {t.noPlayers}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-start">
        {sortedSessions.length === 0 ? (
          <div className={`col-span-full py-20 text-center text-slate-500 border-2 border-dashed rounded-[2rem] transition-colors flex flex-col items-center justify-center gap-4 ${isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <PlayCircle size={48} className="opacity-20 text-emerald-500" />
            <p className="font-bold text-lg opacity-40">{t.noActiveSessions}</p>
          </div>
        ) : sortedSessions.map(session => {
          const marketTotal = calculateMarketTotal(session.marketItems);
          const marketCount = Array.isArray(session.marketItems) ? session.marketItems.reduce((s, i) => s + i.quantity, 0) : 0;
          
          const isActuallyActive = session.gamesPlayed > 0 || marketCount > 0;
          const isWaiting = !isActuallyActive;

          return (
            <div 
              key={session.id} 
              className={`rounded-[2rem] transition-all relative group overflow-hidden animate-in fade-in duration-500 border ${
                isDark ? 'bg-slate-800' : 'bg-white'
              } ${
                isWaiting 
                  ? 'p-3 border-slate-700/40 opacity-80 hover:opacity-100 hover:border-slate-600' 
                  : 'p-6 border-emerald-500 shadow-2xl scale-[1.01]'
              }`}
            >
              {(isWaiting || isAdmin) && (
                <button 
                  onClick={() => removeSession(session.id)}
                  className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-1.5 rounded-full bg-slate-900/30 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-20`}
                >
                  <X size={14} />
                </button>
              )}

              {isActuallyActive && (
                <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} z-20`}>
                  <button 
                    onClick={() => setShowTimingsId(session.id)}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all shadow-md group/info ${
                      isDark ? 'bg-slate-900/50 border-slate-700 text-emerald-500 hover:bg-emerald-500/10' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <Info size={16} className="relative z-10 transition-transform group-hover/info:scale-110" />
                  </button>
                </div>
              )}

              <div className={`flex justify-between items-start ${isWaiting ? 'mb-1' : 'mb-4'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : ''}>
                  {isActuallyActive && (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border mb-2 text-emerald-500 bg-emerald-500/10 border-emerald-500/20 ${isRTL ? 'mr-0' : 'ml-10'}`}>
                      {t.rate}: {formatCurrency(session.pricePerGame)}
                    </div>
                  )}
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h4 
                      className={`font-black truncate ${isWaiting ? 'max-w-[120px] opacity-70' : 'max-w-[150px] md:max-w-[180px]'} ${isDark ? 'text-white' : 'text-slate-900'}`}
                      style={{ fontSize: `${isWaiting ? Math.max(12, settings.playerNameFontSize - 6) : settings.playerNameFontSize}px` }}
                    >
                      {session.playerName}
                    </h4>
                    
                    <button 
                      onClick={() => setMarketModalSessionId(session.id)}
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-all shadow-sm relative ${
                        marketCount > 0 
                        ? 'bg-amber-500 border-amber-600 text-white animate-bounce-short' 
                        : (isDark ? 'bg-slate-900/50 border-slate-700 text-amber-500 hover:bg-amber-500/10' : 'bg-white border-amber-200 text-amber-600 hover:bg-emerald-50')
                      }`}
                    >
                      <Coffee size={14} />
                      {marketCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[7px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                          {marketCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`flex items-center ${isWaiting ? 'justify-center my-2' : 'justify-between mb-4'} p-3 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80' : 'bg-slate-50'} ${isWaiting ? (isDark ? 'border-slate-800/50 py-1.5' : 'border-slate-100 py-1.5') : (isDark ? 'border-slate-700 p-4' : 'border-slate-200 p-4')}`}>
                {!isWaiting && (
                  <>
                    <button 
                      onClick={() => requestTableSelection(session.id, -1)}
                      disabled={!isAdmin}
                      className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl font-black transition-all ${isAdmin ? 'bg-slate-700 hover:bg-rose-600 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-40'}`}
                    >
                      {isAdmin ? '-' : <Lock size={14} />}
                    </button>
                    <div className="text-center px-4">
                      <p className={`text-3xl md:text-4xl font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{session.gamesPlayed}</p>
                    </div>
                  </>
                )}
                <button 
                  onClick={() => requestTableSelection(session.id, 1)}
                  className={`${isWaiting ? 'w-full py-1.5 h-8 text-sm' : 'w-10 h-10 md:w-12 md:h-12 text-xl'} flex items-center justify-center bg-emerald-600 rounded-xl hover:bg-emerald-500 text-white font-black transition-all shadow-lg`}
                >
                  <Plus size={18} />
                </button>
              </div>

              {isActuallyActive && (
                <>
                  <div className="space-y-2 mb-6 px-1">
                    <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-slate-500 font-bold">{t.subtotal}:</span>
                      <span className={`font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {formatCurrency(session.gamesPlayed * session.pricePerGame)}
                      </span>
                    </div>
                    {marketTotal > 0 && (
                      <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-amber-500 font-bold">{t.marketTotal}:</span>
                        <span className="font-black text-amber-500">
                          +{formatCurrency(marketTotal)}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-center justify-between pt-2 border-t border-slate-700/30 ${isRTL ? 'flex-row-reverse' : ''}`}>
                       <span className="text-slate-400 font-black uppercase text-[10px]">{t.total}:</span>
                       <span className={`text-xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {formatCurrency((session.gamesPlayed * session.pricePerGame) + marketTotal)}
                       </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSession(session)}
                    className={`w-full py-4 bg-slate-700 hover:bg-emerald-600 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Calculator size={18} /> {t.checkout}
                  </button>
                </>
              )}

              {isWaiting && (
                <div className={`w-full text-center text-[7px] font-black uppercase tracking-widest text-slate-600 opacity-40`}>
                  {t.waiting}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MARKET MENU MODAL */}
      {marketModalSessionId && currentMarketSession && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className={`w-full max-w-md rounded-[3rem] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                   <Coffee size={24} className="text-amber-500" />
                   <div>
                     <h3 className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.market}</h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentMarketSession.playerName}</p>
                   </div>
                </div>
                <button onClick={() => setMarketModalSessionId(null)} className="w-10 h-10 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {(settings.marketItems || []).map((item) => {
                  const existing = Array.isArray(currentMarketSession.marketItems) 
                    ? currentMarketSession.marketItems.find(i => i.name === item.name) 
                    : null;
                  const qty = existing?.quantity || 0;

                  return (
                    <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${qty > 0 ? (isDark ? 'bg-amber-500/10 border-amber-500/30 shadow-inner' : 'bg-amber-50 border-amber-200 shadow-sm') : (isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100')} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex flex-col ${isRTL ? 'text-right' : ''}`}>
                        <span className={`text-base font-black ${qty > 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{formatCurrency(item.price)}</span>
                      </div>

                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button 
                          onClick={() => updateMarketItem(currentMarketSession.id, item.name, -1)}
                          disabled={qty === 0}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${qty === 0 ? 'bg-slate-800 text-slate-700 cursor-not-allowed opacity-20' : 'bg-slate-700 text-rose-500 hover:bg-rose-500 hover:text-white'}`}
                        >
                          <Minus size={18} />
                        </button>
                        <span className={`w-10 text-center font-black text-xl ${qty > 0 ? (isDark ? 'text-white' : 'text-slate-800') : 'text-slate-700'}`}>
                          {qty}
                        </span>
                        <button 
                          onClick={() => updateMarketItem(currentMarketSession.id, item.name, 1)}
                          className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-lg active:scale-90"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 bg-slate-900/40 border-t border-slate-700">
                <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <span className="text-sm font-black text-slate-500 uppercase">{t.marketTotal}:</span>
                   <span className="text-2xl font-black text-amber-500">{formatCurrency(calculateMarketTotal(currentMarketSession.marketItems))}</span>
                </div>
                <button 
                  onClick={() => setMarketModalSessionId(null)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {t.confirmAction || 'OK'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Timings Overlay Modal */}
      {showTimingsId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className={`w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                   <Clock size={20} className="text-emerald-500" />
                   <div>
                     <h3 className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.gameTimings}</h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{sessions.find(s => s.id === showTimingsId)?.playerName}</p>
                   </div>
                </div>
                <button onClick={() => setShowTimingsId(null)} className="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {sessions.find(s => s.id === showTimingsId)?.gameStartTimes.map((time, idx) => {
                  const tableNum = sessions.find(s => s.id === showTimingsId)?.gameTables?.[idx] || 0;
                  return (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="w-6 h-6 flex items-center justify-center bg-emerald-500 text-white rounded-lg text-[10px] font-black">#{idx + 1}</span>
                        <span className={`text-sm font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LayoutGrid size={14} />
                        <span className="text-xs font-black uppercase">M{tableNum || '?'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6">
                <button 
                  onClick={() => setShowTimingsId(null)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {t.confirmAction || 'OK'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Table Selection Modal */}
      {pendingTableSelect && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className={`w-full max-w-md rounded-[2.5rem] border shadow-2xl p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <LayoutGrid size={32} />
                 </div>
                 <h3 className="text-xl font-black text-white">{isRTL ? 'مێزەکە هەڵبژێرە' : 'Select Table'}</h3>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                 {availableTables.map(num => (
                   <button
                     key={num}
                     onClick={() => updateGames(pendingTableSelect.sessionId, pendingTableSelect.delta, num)}
                     className="p-4 sm:p-6 rounded-2xl border-2 border-slate-700 bg-slate-900 text-white font-black text-xl sm:text-2xl hover:border-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-90"
                   >
                     {num}
                   </button>
                 ))}
              </div>

              <button 
                onClick={() => setPendingTableSelect(null)}
                className="w-full mt-6 py-3 text-slate-500 hover:text-rose-500 font-bold text-sm transition-colors"
              >
                {t.cancel}
              </button>
           </div>
        </div>
      )}

      {/* New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className={`w-full max-w-lg md:max-w-xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col max-h-[95vh] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-900/20' : 'border-slate-100 bg-slate-50'} ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.newSession}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className={isRTL ? 'text-right' : ''}>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.pricePerGame}</label>
                <input 
                  type="number" 
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 font-black ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div className="space-y-3">
                <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.addNewPlayer}</label>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input 
                    type="text" 
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className={`flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 font-bold ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
                    placeholder={t.playerName}
                  />
                  <button onClick={handleAddNewPlayer} className="bg-emerald-600 hover:bg-emerald-500 text-white w-12 h-12 rounded-xl transition-all shadow-lg flex items-center justify-center shrink-0 active:scale-90">
                    <UserPlus size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {selectedSession && !pendingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className={`w-full max-w-lg md:max-w-xl rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-900/30' : 'bg-slate-50'} ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.finalizePayment}</h3>
              <button onClick={() => setSelectedSession(null)} className="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8">
              <div className="mb-6 p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 space-y-3">
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-500 font-bold text-sm">{t.playerName}:</span>
                  <span className="font-black text-white">{selectedSession.playerName}</span>
                </div>
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-300 font-black text-lg">{t.total}:</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency((selectedSession.gamesPlayed * selectedSession.pricePerGame) + calculateMarketTotal(selectedSession.marketItems))}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={() => initiatePayment(selectedSession, 'CASH')} className="p-6 border rounded-2xl bg-emerald-600/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all flex flex-col items-center gap-2">
                  <Banknote size={24} />
                  <span className="font-black text-sm">{t.cash}</span>
                </button>
                
                {/* CREDIT (Discount) Button - Visual dimming and disabling based on game count and total amount */}
                <button 
                  onClick={() => {
                    const amount = selectedSession.gamesPlayed * selectedSession.pricePerGame;
                    if (selectedSession.gamesPlayed >= 4 && amount >= 3000) {
                      initiatePayment(selectedSession, 'CREDIT');
                    }
                  }} 
                  disabled={selectedSession.gamesPlayed < 4 || (selectedSession.gamesPlayed * selectedSession.pricePerGame) < 3000}
                  className={`p-6 border rounded-2xl transition-all flex flex-col items-center gap-2 ${
                    (selectedSession.gamesPlayed >= 4 && (selectedSession.gamesPlayed * selectedSession.pricePerGame) >= 3000)
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-500 hover:bg-blue-600 hover:text-white' 
                    : 'bg-slate-700/40 border-slate-700 text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Percent size={24} />
                  <span className="font-black text-sm">{t.credit}</span>
                  {(selectedSession.gamesPlayed < 4 || (selectedSession.gamesPlayed * selectedSession.pricePerGame) < 3000) && (
                    <span className="text-[7px] font-bold uppercase tracking-tighter opacity-70">
                      {selectedSession.gamesPlayed < 4 ? '(Min 4 Games)' : '(Min 3,000 IQD)'}
                    </span>
                  )}
                </button>

                <button onClick={() => initiatePayment(selectedSession, 'DEBT')} className="p-6 border rounded-2xl bg-amber-600/10 border-amber-500/30 text-amber-500 hover:bg-amber-600 hover:text-white transition-all flex flex-col items-center gap-2"><UserMinus size={24} /><span className="font-black text-sm">{t.debt}</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Note Modal with Detailed Breakdown */}
      {pendingPayment && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-900/30' : 'bg-slate-50'} ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.confirmAction}</h3>
              <button onClick={() => setPendingPayment(null)} className="w-8 h-8 rounded-full bg-slate-900/50 flex items-center justify-center text-slate-400"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-700/50 space-y-4">
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t.player}</span>
                  <span className="text-lg font-black text-white">{pendingPayment.session.playerName}</span>
                </div>
                
                <div className="h-px bg-slate-700/50"></div>

                {/* Detailed Breakdown */}
                <div className="space-y-2">
                  <div className={`flex justify-between items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-400">{t.gamesPlayed} ({pendingPayment.session.gamesPlayed}):</span>
                    <span className="text-white font-bold">{formatCurrency(pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame)}</span>
                  </div>
                  
                  {calculateMarketTotal(pendingPayment.session.marketItems) > 0 && (
                    <div className={`flex justify-between items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-amber-500/80">{t.marketTotal}:</span>
                      <span className="text-amber-500 font-bold">+{formatCurrency(calculateMarketTotal(pendingPayment.session.marketItems))}</span>
                    </div>
                  )}

                  {pendingPayment.method === 'CREDIT' && calculateTieredDiscount(pendingPayment.session.gamesPlayed, pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) > 0 && (
                    <div className={`flex justify-between items-center text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-rose-400/80">{t.credit} ({t.discount}):</span>
                      <span className="text-rose-400 font-bold">-{formatCurrency(calculateTieredDiscount(pendingPayment.session.gamesPlayed, pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame))}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-700/50"></div>

                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-300 font-black text-lg">{pendingPayment.method === 'DEBT' ? t.totalDebt : (isRTL ? 'کۆی گشتی داواکراو' : 'Total Expected')}</span>
                  <span className={`text-2xl font-black ${pendingPayment.method === 'DEBT' ? 'text-amber-500' : 'text-slate-200'}`}>
                    {formatCurrency(Math.max(0, (pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) + calculateMarketTotal(pendingPayment.session.marketItems) - (pendingPayment.method === 'CREDIT' ? calculateTieredDiscount(pendingPayment.session.gamesPlayed, pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) : 0)))}
                  </span>
                </div>
              </div>

              {/* Received Amount Toggle & Warning */}
              <div className="space-y-4">
                 <div className={`flex items-center justify-between px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'بڕی وەرگیراو' : 'Amount Received'}</span>
                   <button 
                    onClick={() => setShowManualPriceInput(!showManualPriceInput)}
                    className={`p-2 rounded-xl transition-all ${showManualPriceInput ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-800 text-amber-500 border border-amber-500/20'}`}
                   >
                     {showManualPriceInput ? <X size={16} /> : <ShieldAlert size={16} />}
                   </button>
                 </div>

                 {showManualPriceInput && (
                   <div className="animate-in slide-in-from-top-2 duration-300 space-y-4">
                      <div className="relative">
                        <input 
                          type="number"
                          autoFocus
                          value={actualPaidAmount}
                          onChange={(e) => setActualPaidAmount(Number(e.target.value))}
                          className={`w-full bg-slate-900 border border-amber-500/50 rounded-2xl py-5 px-6 text-white text-3xl font-black focus:outline-none focus:border-amber-500 transition-all shadow-inner ${isRTL ? 'text-right' : ''}`}
                        />
                        <div className={`absolute top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs ${isRTL ? 'left-6' : 'right-6'}`}>IQD</div>
                      </div>

                      {actualPaidAmount !== Math.max(0, (pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) + calculateMarketTotal(pendingPayment.session.marketItems) - (pendingPayment.method === 'CREDIT' ? calculateTieredDiscount(pendingPayment.session.gamesPlayed, pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) : 0)) && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-500 animate-pulse">
                           <AlertTriangle size={24} className="shrink-0" />
                           <p className="text-xs font-black uppercase leading-tight">
                             {isRTL ? 'ئەم نرخە دەرچوونە لە یاساکان' : 'This price is a violation of the rules'}
                           </p>
                        </div>
                      )}
                   </div>
                 )}
              </div>

              <div className="space-y-3">
                <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 ${isRTL ? 'text-right' : ''}`}>{t.note}</label>
                <textarea 
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={t.addNote}
                  className={`w-full min-h-[80px] bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500 font-medium transition-all resize-none ${isRTL ? 'text-right' : ''}`}
                />
              </div>

              <button 
                onClick={finalizePayment}
                className={`w-full py-5 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                  pendingPayment.method === 'DEBT' 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' 
                    : (actualPaidAmount < Math.max(0, (pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) + calculateMarketTotal(pendingPayment.session.marketItems) - (pendingPayment.method === 'CREDIT' ? calculateTieredDiscount(pendingPayment.session.gamesPlayed, pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) : 0)) ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20')
                }`}
              >
                {pendingPayment.method === 'DEBT' ? <UserMinus size={24} /> : (actualPaidAmount < Math.max(0, (pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) + calculateMarketTotal(pendingPayment.session.marketItems) - (pendingPayment.method === 'CREDIT' ? calculateTieredDiscount(pendingPayment.session.gamesPlayed, pendingPayment.session.gamesPlayed * pendingPayment.session.pricePerGame) : 0)) ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />)}
                {t.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;

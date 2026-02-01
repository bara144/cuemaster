
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, X, Users, Shuffle, Medal, Timer, Plus, Banknote, CheckCircle, Circle, DollarSign, Archive, Trash2, ArrowDown, Lock, Info, ChevronRight, UserCheck, UserMinus, GitMerge, Layout, Hash, Zap } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
}

interface Match {
  id: string;
  p1Id: string | null;
  p2Id: string | null;
  p1Wins: number;
  p2Wins: number;
  winnerId: string | null;
  round: number;
}

interface TournamentData {
  id: string;
  participants: Participant[];
  currentRoundMatches: Match[];
  roundHistory: { matches: Match[], byeId: string | null }[]; 
  roundNumber: number;
  status: 'SETUP' | 'ACTIVE' | 'FINISHED';
  winnerId: string | null;
  byePlayerId: string | null;
  winnersPool: string[];
  winsNeeded: number;
  entryFee: number;
  paidParticipantIds: string[];
  timestamp: number;
}

interface TournamentManagerProps {
  players: string[];
  tournamentData: TournamentData | null;
  setTournamentData: (data: TournamentData | null) => void;
  tournamentHistory: TournamentData[];
  setTournamentHistory: (history: TournamentData[]) => void;
  t: any;
  isRTL: boolean;
  isDark: boolean;
  isAdmin: boolean;
  settings?: any;
}

const TournamentManager: React.FC<TournamentManagerProps> = ({ 
  players: existingPlayers, 
  tournamentData, 
  setTournamentData, 
  tournamentHistory,
  setTournamentHistory,
  t, 
  isRTL,
  isDark,
  isAdmin,
  settings
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [localParticipants, setLocalParticipants] = useState<Participant[]>([]);
  const [winsNeeded, setWinsNeeded] = useState(2);
  const [entryFee, setEntryFee] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  
  const [isPressingCancel, setIsPressingCancel] = useState(false);
  const [cancelProgress, setCancelProgress] = useState(0);
  const cancelIntervalRef = useRef<number | null>(null);

  const [pressingArchiveId, setPressingArchiveId] = useState<string | null>(null);
  const [archiveProgress, setArchiveProgress] = useState(0);
  const archiveIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (tournamentData) {
      setLocalParticipants(tournamentData.participants);
      setWinsNeeded(tournamentData.winsNeeded || 2);
      setEntryFee(tournamentData.entryFee || 0);
    } else {
      setLocalParticipants([]);
    }
  }, [tournamentData]);

  const addParticipant = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (localParticipants.some(p => p.name === trimmed)) return;
    setLocalParticipants(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: trimmed }]);
    setNewParticipantName('');
  };

  const isProtected = (id: string | null) => {
    if (!id) return false;
    const p = localParticipants.find(part => part.id === id);
    const protectedPlayerNames = settings?.protectedPlayers || [];
    return p && protectedPlayerNames.includes(p.name);
  };

  const totalExpectedRounds = useMemo(() => {
    if (!tournamentData) return 0;
    return Math.ceil(Math.log2(tournamentData.participants.length));
  }, [tournamentData]);

  const createRound = (playerIds: string[], roundNum: number, currentWinsNeeded: number, currentEntryFee: number, currentPaidIds: string[]): TournamentData => {
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    let protectedPool = shuffled.filter(id => isProtected(id));
    let regularPool = shuffled.filter(id => !isProtected(id));

    let byePlayerId: string | null = null;
    const totalCount = protectedPool.length + regularPool.length;
    if (totalCount % 2 !== 0) {
      if (protectedPool.length > 0) {
        byePlayerId = protectedPool.pop() || null;
      } else {
        byePlayerId = regularPool.pop() || null;
      }
    }

    const matchPairs: { p1: string | null, p2: string | null }[] = [];
    while (protectedPool.length > 0 && regularPool.length > 0) {
      matchPairs.push({ p1: protectedPool.pop()!, p2: regularPool.pop()! });
    }
    while (regularPool.length >= 2) {
      matchPairs.push({ p1: regularPool.pop()!, p2: regularPool.pop()! });
    }
    while (protectedPool.length >= 2) {
      matchPairs.push({ p1: protectedPool.pop()!, p2: protectedPool.pop()! });
    }

    const matches: Match[] = matchPairs.map((pair, idx) => ({
      id: `r${roundNum}-m${idx}-${Date.now()}`,
      p1Id: pair.p1,
      p2Id: pair.p2,
      p1Wins: 0,
      p2Wins: 0,
      winnerId: null,
      round: roundNum
    }));

    return {
      id: tournamentData?.id || Math.random().toString(36).substr(2, 9),
      participants: tournamentData?.participants || localParticipants,
      currentRoundMatches: matches,
      roundHistory: tournamentData?.roundHistory || [],
      roundNumber: roundNum,
      status: 'ACTIVE',
      winnerId: null,
      byePlayerId,
      winnersPool: [],
      winsNeeded: currentWinsNeeded,
      entryFee: currentEntryFee,
      paidParticipantIds: currentPaidIds,
      timestamp: tournamentData?.timestamp || Date.now()
    };
  };

  const startTournament = () => {
    if (localParticipants.length < 2) return;
    const initialIds = localParticipants.map(p => p.id);
    setTournamentData(createRound(initialIds, 1, winsNeeded, entryFee, []));
  };

  const proceedToNextRound = () => {
    if (!tournamentData) return;
    const pool = [...tournamentData.winnersPool];
    if (tournamentData.byePlayerId) pool.push(tournamentData.byePlayerId);
    
    const currentRoundRecord = { 
      matches: tournamentData.currentRoundMatches, 
      byeId: tournamentData.byePlayerId 
    };
    const newHistory = [...tournamentData.roundHistory, currentRoundRecord];

    if (pool.length === 1) {
       setTournamentData({
          ...tournamentData,
          roundHistory: newHistory,
          status: 'FINISHED',
          winnerId: pool[0]
       });
    } else {
       const nextRound = createRound(pool, tournamentData.roundNumber + 1, tournamentData.winsNeeded, tournamentData.entryFee, tournamentData.paidParticipantIds);
       setTournamentData({
         ...nextRound,
         roundHistory: newHistory
       });
    }
  };

  const updateWin = (matchId: string, playerNum: 1 | 2, delta: number) => {
    if (!tournamentData) return;
    const targetWins = tournamentData.winsNeeded || 2;

    const newMatches = tournamentData.currentRoundMatches.map(m => {
      if (m.id === matchId) {
        const updated = { ...m };
        if (playerNum === 1) updated.p1Wins = Math.max(0, updated.p1Wins + delta);
        else updated.p2Wins = Math.max(0, updated.p2Wins + delta);

        if (updated.p1Wins >= targetWins) updated.winnerId = updated.p1Id;
        else if (updated.p2Wins >= targetWins) updated.winnerId = updated.p2Id;
        else updated.winnerId = null;

        return updated;
      }
      return m;
    });

    const currentWinners = newMatches
      .filter(m => m.winnerId !== null)
      .map(m => m.winnerId as string);

    setTournamentData({
      ...tournamentData,
      currentRoundMatches: newMatches,
      winnersPool: currentWinners
    });
  };

  const togglePayment = (playerId: string) => {
    if (!tournamentData) return;
    const isPaid = tournamentData.paidParticipantIds.includes(playerId);
    const newPaidIds = isPaid 
      ? tournamentData.paidParticipantIds.filter(id => id !== playerId)
      : [...tournamentData.paidParticipantIds, playerId];
    
    setTournamentData({
      ...tournamentData,
      paidParticipantIds: newPaidIds
    });
  };

  const archiveTournamentAction = () => {
    if (!tournamentData) return;
    setTournamentHistory([tournamentData, ...tournamentHistory]);
    setTournamentData(null);
  };

  const startCancelPress = () => {
    setIsPressingCancel(true);
    setCancelProgress(0);
    const startTime = Date.now();
    const duration = 1000;
    cancelIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setCancelProgress(progress);
      if (elapsed >= duration) {
        stopCancelPress();
        setTournamentData(null);
      }
    }, 20);
  };

  const stopCancelPress = () => {
    if (cancelIntervalRef.current) clearInterval(cancelIntervalRef.current);
    setIsPressingCancel(false);
    setCancelProgress(0);
  };

  const startDeleteArchivePress = (id: string) => {
    setPressingArchiveId(id);
    setArchiveProgress(0);
    const startTime = Date.now();
    const duration = 2000; 
    archiveIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setArchiveProgress(progress);
      if (elapsed >= duration) {
        stopDeleteArchivePress();
        setTournamentHistory(tournamentHistory.filter(tHist => tHist.id !== id));
      }
    }, 20);
  };

  const stopDeleteArchivePress = () => {
    if (archiveIntervalRef.current) clearInterval(archiveIntervalRef.current);
    setPressingArchiveId(null);
    setArchiveProgress(0);
  };

  const getPlayerName = (id: string | null, participants: Participant[] = localParticipants) => {
    if (!id) return "---";
    const p = participants.find(part => part.id === id);
    return p ? p.name : "Unknown";
  };

  const formatCurrency = (val: number) => val.toLocaleString() + " IQD";

  const renderBracketMap = () => {
    if (!tournamentData) return null;
    
    const displayRounds: { matches: Match[], byeId: string | null, isFuture?: boolean }[] = [];
    const totalRounds = totalExpectedRounds;
    
    tournamentData.roundHistory.forEach(record => displayRounds.push(record));
    displayRounds.push({ 
      matches: tournamentData.currentRoundMatches, 
      byeId: tournamentData.byePlayerId 
    });

    for (let r = displayRounds.length + 1; r <= totalRounds; r++) {
      const lastRoundItem = displayRounds[displayRounds.length - 1];
      const prevTotalParticipating = (lastRoundItem.matches.length * 2) + (lastRoundItem.byeId ? 1 : 0);
      const nextTotal = Math.ceil(prevTotalParticipating / 2);
      const futureMatchesCount = Math.floor(nextTotal / 2);
      const futureBye = nextTotal % 2 !== 0;

      displayRounds.push({
        matches: Array.from({ length: futureMatchesCount }).map((_, idx) => ({
          id: `f-r${r}-m${idx}`, p1Id: null, p2Id: null, winnerId: null, round: r, p1Wins: 0, p2Wins: 0
        })),
        byeId: futureBye ? "future-bye" : null,
        isFuture: true
      });
    }

    return (
      <div className={`relative flex w-full gap-2 items-stretch h-full ${isRTL ? 'flex-row-reverse' : ''}`} dir="ltr">
        {displayRounds.map((roundRecord, rIdx) => (
          <div key={rIdx} className="flex-1 flex flex-col gap-4 min-w-0 relative py-2">
            <div className="text-center shrink-0 z-20">
              <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg text-[8px] font-black uppercase tracking-widest border border-indigo-500/10">
                {t.round} {rIdx + 1}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col justify-around gap-2 py-4 relative z-10">
              {roundRecord.matches.map((match: Match) => {
                const isFinished = !!match.winnerId;
                const p1Lost = isFinished && match.winnerId !== match.p1Id;
                const p2Lost = isFinished && match.winnerId !== match.p2Id;

                return (
                  <div key={match.id} className="relative w-full">
                    <div className={`w-full rounded-xl border overflow-hidden transition-all duration-300 relative ${roundRecord.isFuture ? 'bg-slate-900/40 border-dashed border-slate-700 opacity-40' : (isFinished ? 'bg-slate-800 border-emerald-500/30 shadow-inner' : 'bg-slate-800 border-indigo-500/30 shadow-lg shadow-indigo-500/5')}`}>
                      {/* Player 1 Row */}
                      <div className={`px-2 py-2 flex justify-between items-center border-b border-slate-700/50 transition-colors ${p1Lost ? 'bg-rose-500/20 text-rose-400' : (match.winnerId === match.p1Id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300')}`}>
                         <span className="text-[10px] font-black truncate flex-1">
                           {getPlayerName(match.p1Id, tournamentData.participants)}
                         </span>
                         {match.winnerId === match.p1Id && <CheckCircle size={10} className="text-emerald-500" />}
                      </div>
                      {/* Player 2 Row */}
                      <div className={`px-2 py-2 flex justify-between items-center transition-colors ${p2Lost ? 'bg-rose-500/20 text-rose-400' : (match.winnerId === match.p2Id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300')}`}>
                         <span className="text-[10px] font-black truncate flex-1">
                           {getPlayerName(match.p2Id, tournamentData.participants)}
                         </span>
                         {match.winnerId === match.p2Id && <CheckCircle size={10} className="text-emerald-500" />}
                      </div>
                    </div>
                    {/* SVG Connector Line (Curvy) */}
                    {rIdx < displayRounds.length - 1 && !roundRecord.isFuture && (
                      <svg className="absolute top-1/2 left-full w-8 h-32 -translate-y-1/2 pointer-events-none z-0 overflow-visible" style={{ left: 'calc(100% - 2px)' }}>
                        <path 
                          d="M 0 64 C 16 64, 16 64, 32 64" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          className="text-indigo-500/30"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}

              {roundRecord.byeId && (
                <div className="relative w-full">
                  <div className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${roundRecord.isFuture ? 'bg-indigo-500/5 border-dashed border-slate-700 opacity-30' : 'bg-indigo-500/10 border-indigo-500/20 shadow-lg'}`}>
                    <span className="text-[9px] font-black text-white truncate w-full text-center">
                      {roundRecord.byeId === "future-bye" ? t.waiting : getPlayerName(roundRecord.byeId, tournamentData.participants)}
                    </span>
                    <div className="px-2 py-0.5 bg-indigo-500/20 rounded text-[7px] font-black text-indigo-400 uppercase tracking-tighter">BYE</div>
                  </div>
                   {rIdx < displayRounds.length - 1 && !roundRecord.isFuture && (
                      <svg className="absolute top-1/2 left-full w-8 h-32 -translate-y-1/2 pointer-events-none z-0 overflow-visible" style={{ left: 'calc(100% - 2px)' }}>
                        <path 
                          d="M 0 64 C 16 64, 16 64, 32 64" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          className="text-indigo-500/30"
                        />
                      </svg>
                    )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSetup = () => (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} p-4`}>
           <div className="px-4 py-2 bg-indigo-600 rounded-2xl flex items-center gap-2 shadow-lg border border-white/10">
              <Users size={18} className="text-white" />
              <span className="text-lg font-black text-white">{localParticipants.length}</span>
           </div>
        </div>

        <div className={`flex items-center gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
             <Trophy size={32} />
           </div>
           <div className={isRTL ? 'text-right' : ''}>
             <h3 className="text-2xl font-black">{t.setupTournament}</h3>
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">{t.winsToWin}</p>
           </div>
        </div>

        <div className="space-y-6">
          <div className={isRTL ? 'text-right' : ''}>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">{t.entryFee}</label>
            <div className="relative">
              <input 
                type="number"
                step="500"
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className={`w-full border rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-black text-lg ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right pr-14' : 'pl-14'}`}
              />
              <Banknote className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-5' : 'left-5'}`} size={22} />
            </div>
          </div>

          <div className={isRTL ? 'text-right' : ''}>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">{t.winsToWin}</label>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setWinsNeeded(num)}
                  className={`flex-1 py-4 rounded-2xl font-black text-base transition-all border shadow-sm ${
                    winsNeeded === num 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20' 
                    : (isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500/50' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-500/50')
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
             <input 
               type="text" 
               value={newParticipantName}
               onChange={(e) => setNewParticipantName(e.target.value)}
               placeholder={t.playerName}
               className={`flex-1 border rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 font-bold text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
             />
             <button onClick={() => addParticipant(newParticipantName)} className="bg-emerald-600 hover:bg-emerald-500 text-white w-14 h-14 rounded-2xl transition-all shadow-xl flex items-center justify-center shrink-0 active:scale-95">
               <Plus size={32} />
             </button>
          </div>

          <div className={`border-t pt-6 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
             <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto px-1 custom-scrollbar">
                {localParticipants.map(p => (
                  <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center gap-3 truncate">
                       <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0">#</span>
                       <span className="text-sm font-bold truncate">{p.name}</span>
                    </div>
                    <button onClick={() => setLocalParticipants(prev => prev.filter(lp => lp.id !== p.id))} className="text-slate-500 hover:text-rose-500 p-2"><X size={16} /></button>
                  </div>
                ))}
             </div>
          </div>

          <button 
            disabled={localParticipants.length < 2}
            onClick={startTournament}
            className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${
              localParticipants.length < 2 ? 'bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            <Shuffle size={24} /> {t.startTournament}
          </button>
        </div>
      </div>

      {tournamentHistory.length > 0 && (
        <div className="space-y-6">
           <h4 className={`text-sm font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3 px-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
             <Archive size={18} /> {t.tournamentArchive}
           </h4>
           <div className="grid grid-cols-1 gap-6">
              {tournamentHistory.map(archive => {
                const champ = archive.participants.find(p => p.id === archive.winnerId);
                const isDeleting = pressingArchiveId === archive.id;
                const archiveRevenue = archive.paidParticipantIds.length * archive.entryFee;
                
                return (
                  <div key={archive.id} className={`p-6 rounded-[2.5rem] border relative overflow-hidden transition-all hover:scale-[1.01] ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-md'}`}>
                    <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                       <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                             <Hash size={10} /> {archive.participants.length} Players
                          </p>
                          <h5 className="text-xl font-black text-white leading-tight">{champ?.name || '---'}</h5>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.champion}</span>
                       </div>
                       
                       <button 
                         onMouseDown={() => startDeleteArchivePress(archive.id)}
                         onMouseUp={stopDeleteArchivePress}
                         onMouseLeave={stopDeleteArchivePress}
                         onTouchStart={() => startDeleteArchivePress(archive.id)}
                         onTouchEnd={stopDeleteArchivePress}
                         className="relative w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center transition-all overflow-hidden active:scale-95"
                       >
                         {isDeleting && (
                           <div className="absolute bottom-0 left-0 h-full bg-rose-500/40 transition-all ease-linear" style={{ width: `${archiveProgress}%` }} />
                         )}
                         <Trash2 size={22} className="relative z-10" />
                       </button>
                    </div>

                    {isAdmin && (
                      <div className={`mt-6 pt-6 border-t border-slate-700/50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.totalCollected}</span>
                           <span className="text-lg font-black text-emerald-400">{formatCurrency(archiveRevenue)}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-bold italic">
                           {new Date(archive.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </div>
      )}
    </div>
  );

  const renderActive = () => {
    if (!tournamentData) return null;
    const totalCollected = tournamentData.paidParticipantIds.length * tournamentData.entryFee;
    const matchesFinished = tournamentData.currentRoundMatches.every(m => m.winnerId !== null);

    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 items-start ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="lg:col-span-2 space-y-6">
            <div className={`flex items-center justify-between p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-xl'} shadow-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
               <div className={isRTL ? 'text-right' : ''}>
                  <div className="flex items-center gap-3 mb-2">
                     <span className="px-3 py-1 bg-indigo-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 border border-white/10">
                       {t.round} {tournamentData.roundNumber} / {totalExpectedRounds}
                     </span>
                     <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                        <Users size={12} /> {tournamentData.participants.length} Players
                     </div>
                  </div>
                  <h3 className="text-2xl font-black text-white">{t.tournamentActive}</h3>
               </div>
               
               <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <button 
                   onClick={() => setShowSummary(true)}
                   className="p-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all active:scale-95 shadow-md"
                   title={t.bracketSummary}
                 >
                   <Layout size={24} />
                 </button>
                 <div className="flex flex-col items-center">
                   <button 
                     onMouseDown={startCancelPress} onMouseUp={stopCancelPress} onMouseLeave={stopCancelPress} onTouchStart={startCancelPress} onTouchEnd={stopCancelPress}
                     className="relative px-8 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-xs font-black transition-all overflow-hidden active:scale-95"
                   >
                     {isPressingCancel && <div className="absolute bottom-0 left-0 h-full bg-rose-500/40 transition-all ease-linear" style={{ width: `${cancelProgress}%` }} />}
                     <span className="relative z-10">{t.cancel}</span>
                   </button>
                   <span className="text-[8px] text-slate-500 font-bold uppercase mt-1.5 tracking-widest">{t.holdToCancel}</span>
                 </div>
               </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              {tournamentData.currentRoundMatches.map((match) => {
                const isP1Winner = match.winnerId === match.p1Id;
                const isP2Winner = match.winnerId === match.p2Id;
                const isFinished = !!match.winnerId;

                return (
                  <div key={match.id} className={`w-full p-8 rounded-[2.5rem] border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} ${isFinished ? 'opacity-50 grayscale-[0.3]' : 'shadow-2xl scale-[1.01] border-indigo-500/20'}`}>
                    <div className="flex flex-col gap-6">
                        <div className={`flex items-center justify-between gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-4 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white ${isP1Winner ? 'bg-emerald-600 shadow-emerald-500/20 shadow-lg' : 'bg-slate-700'}`}>
                              {getPlayerName(match.p1Id, tournamentData.participants)[0]}
                            </div>
                            <p className={`text-xl transition-all truncate flex-1 ${isP1Winner ? 'text-emerald-400 font-black scale-105 origin-left' : isFinished ? 'line-through text-slate-500 italic' : 'font-black text-white'}`}>
                              {getPlayerName(match.p1Id, tournamentData.participants)}
                            </p>
                          </div>
                          {!isFinished ? (
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                               <button onClick={() => updateWin(match.id, 1, -1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">-</button>
                               <span className="w-10 text-center font-black text-3xl text-white">{match.p1Wins}</span>
                               <button onClick={() => updateWin(match.id, 1, 1)} className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-600/20 active:scale-95">+</button>
                            </div>
                          ) : (
                            <span className={`text-4xl font-black ${isP1Winner ? 'text-emerald-400' : 'text-slate-600'}`}>{match.p1Wins}</span>
                          )}
                        </div>
                        <div className="h-px bg-slate-700/30 w-full"></div>
                        <div className={`flex items-center justify-between gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-4 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white ${isP2Winner ? 'bg-emerald-600 shadow-emerald-500/20 shadow-lg' : 'bg-slate-700'}`}>
                              {getPlayerName(match.p2Id, tournamentData.participants)[0]}
                            </div>
                            <p className={`text-xl transition-all truncate flex-1 ${isP2Winner ? 'text-emerald-400 font-black scale-105 origin-left' : isFinished ? 'line-through text-slate-500 italic' : 'font-black text-white'}`}>
                              {getPlayerName(match.p2Id, tournamentData.participants)}
                            </p>
                          </div>
                          {!isFinished ? (
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                               <button onClick={() => updateWin(match.id, 2, -1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">-</button>
                               <span className="w-10 text-center font-black text-3xl text-white">{match.p2Wins}</span>
                               <button onClick={() => updateWin(match.id, 2, 1)} className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-600/20 active:scale-95">+</button>
                            </div>
                          ) : (
                            <span className={`text-4xl font-black ${isP2Winner ? 'text-emerald-400' : 'text-slate-600'}`}>{match.p2Wins}</span>
                          )}
                        </div>
                    </div>
                  </div>
                );
              })}

              {tournamentData.byePlayerId && (
                <div className={`w-full p-6 rounded-[2.5rem] border border-dashed flex items-center justify-center gap-4 animate-pulse ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                   <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Timer size={20} />
                   </div>
                   <div className="flex flex-col items-center">
                     <span className="text-lg font-black text-white">{getPlayerName(tournamentData.byePlayerId, tournamentData.participants)}</span>
                     <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">{t.byePlayer}</span>
                   </div>
                </div>
              )}

              {matchesFinished && (
                <button onClick={proceedToNextRound} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all shadow-emerald-600/30">
                   <Shuffle size={28} /> {t.shufflePlayers}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className={`p-8 rounded-[2.5rem] border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Users size={24} className="text-blue-500" />
                    <h4 className="text-base font-black uppercase tracking-widest text-white">{t.playersDirectory}</h4>
                 </div>
                 <span className="bg-slate-900 px-3 py-1 rounded-full text-xs font-black text-slate-500 border border-slate-700">
                   {tournamentData.participants.length}
                 </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {tournamentData.participants.map(p => {
                  const isPaid = tournamentData.paidParticipantIds.includes(p.id);
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isPaid ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-sm') : (isDark ? 'bg-slate-900/50 border-slate-700 opacity-60' : 'bg-slate-50 border-slate-100')} ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                          {p.name[0]}
                        </div>
                        <span className={`text-sm font-bold truncate flex-1 ${isPaid ? 'text-emerald-400' : 'text-slate-400'}`}>{p.name}</span>
                      </div>
                      <button onClick={() => togglePayment(p.id)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 hover:bg-slate-600 hover:text-white'}`}>
                        {isPaid ? <CheckCircle size={26} /> : <Circle size={26} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {isAdmin && (
              <div className="p-8 rounded-[3rem] border shadow-2xl bg-gradient-to-br from-indigo-900/40 via-slate-800 to-indigo-950 border-indigo-500/30 relative overflow-hidden group">
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
                <div className={`flex items-center gap-4 mb-8 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <DollarSign size={24} className="text-emerald-400" />
                   <h4 className="text-base font-black uppercase tracking-widest text-white">{t.tournamentRevenue}</h4>
                </div>
                <div className="space-y-6 relative z-10">
                  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.entryFee}</span>
                    <span className="text-sm font-black text-slate-300">{formatCurrency(tournamentData.entryFee)}</span>
                  </div>
                  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.paid} ({tournamentData.paidParticipantIds.length})</span>
                    <span className="text-base font-black text-emerald-400">+{formatCurrency(totalCollected)}</span>
                  </div>
                  <div className="h-px bg-slate-700/50"></div>
                  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-black text-white uppercase tracking-widest">{t.totalCollected}</span>
                    <span className="text-3xl font-black text-emerald-400 drop-shadow-lg">{formatCurrency(totalCollected)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showSummary && (
           <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 animate-in fade-in duration-400">
             <div className={`w-full max-w-5xl rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`p-8 border-b flex justify-between items-center bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shrink-0 relative ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-30"></div>
                   <div className={`flex items-center gap-4 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                         <Layout size={28} />
                      </div>
                      <div className={isRTL ? 'text-right' : ''}>
                         <h3 className="text-xl font-black">{t.bracketSummary}</h3>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="px-2 py-0.5 bg-black/20 rounded text-[9px] font-black uppercase tracking-widest border border-white/10">
                              <Users size={10} className="inline mr-1" /> {tournamentData.participants.length} Players
                            </span>
                         </div>
                      </div>
                   </div>
                   <button onClick={() => setShowSummary(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/30 transition-all active:scale-90 border border-white/10">
                     <X size={20} />
                   </button>
                </div>

                <div className="flex-1 overflow-hidden p-8 bg-slate-900/40 relative">
                   {renderBracketMap()}
                </div>

                <div className="p-6 border-t border-slate-700/50 bg-slate-900/60 shrink-0 flex justify-center">
                   <button onClick={() => setShowSummary(false)} className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs">
                     {isRTL ? 'داخستن' : 'Close Bracket'}
                   </button>
                </div>
             </div>
           </div>
        )}
      </div>
    );
  };

  const renderFinished = () => {
    if (!tournamentData) return null;
    const champion = tournamentData.participants.find(p => p.id === tournamentData.winnerId);

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-in zoom-in-95 duration-500 space-y-12">
         <div className="relative group">
            <div className="absolute inset-0 bg-amber-500 blur-[100px] opacity-40 animate-pulse group-hover:scale-125 transition-all"></div>
            <div className="w-48 h-48 rounded-[3.5rem] bg-gradient-to-br from-amber-400 via-amber-600 to-amber-700 flex items-center justify-center shadow-[0_0_80px_rgba(245,158,11,0.4)] relative z-10 border-8 border-white/20">
               <Trophy size={100} className="text-white drop-shadow-2xl" />
            </div>
         </div>

         <div className="space-y-4">
            <h2 className="text-6xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">{t.champion}!</h2>
            <div className="bg-slate-800/60 backdrop-blur-xl border border-amber-500/40 px-16 py-8 rounded-[3rem] shadow-2xl scale-110">
               <div className="flex items-center justify-center gap-4">
                 <p className="text-5xl font-black text-amber-400 tracking-tight">{champion?.name}</p>
               </div>
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
            <button onClick={() => setShowSummary(true)} className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 shadow-2xl transition-all">
               <Layout size={24} /> {isRTL ? 'نەخشەی خول' : 'View Final Bracket'}
            </button>
            <button onClick={archiveTournamentAction} className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 shadow-2xl transition-all">
               <Archive size={24} /> {t.archiveTournament}
            </button>
         </div>

        {showSummary && (
           <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
             <div className={`w-full max-w-5xl rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`p-8 border-b flex justify-between items-center bg-indigo-600 text-white shrink-0`}>
                   <h3 className="text-xl font-black">{t.bracketSummary}</h3>
                   <button onClick={() => setShowSummary(false)} className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-hidden p-8 bg-slate-900/40">{renderBracketMap()}</div>
                <div className="p-8 border-t border-slate-700 bg-slate-900/20 shrink-0">
                   <button onClick={() => setShowSummary(false)} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs">
                     {isRTL ? 'داخستن' : 'Close'}
                   </button>
                </div>
             </div>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-2 relative h-full">
      <div>
        {!tournamentData && renderSetup()}
        {tournamentData?.status === 'ACTIVE' && renderActive()}
        {tournamentData?.status === 'FINISHED' && renderFinished()}
      </div>
    </div>
  );
};

export default TournamentManager;

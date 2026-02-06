
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, X, Users, Shuffle, Medal, Timer, Plus, Banknote, CheckCircle, Circle, DollarSign, Archive, Trash2, ArrowDown, Lock, Info, ChevronRight, UserCheck, UserMinus, GitMerge, Layout, Hash, Zap, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

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
  setupParticipants: Participant[];
  setSetupParticipants: (parts: Participant[]) => void;
  tournamentHistory: TournamentData[];
  setTournamentHistory: (history: TournamentData[]) => void;
  t: any;
  isRTL: boolean;
  isDark: boolean;
  isAdmin: boolean;
  settings?: any;
}

const TournamentManager: React.FC<TournamentManagerProps> = ({ 
  players: registeredPlayers = [], 
  tournamentData, 
  setTournamentData,
  setupParticipants = [],
  setSetupParticipants,
  tournamentHistory = [],
  setTournamentHistory,
  t, 
  isRTL, 
  isDark, 
  isAdmin,
  settings
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [winsNeeded, setWinsNeeded] = useState(2);
  const [entryFee, setEntryFee] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  
  const [isPressingCancel, setIsPressingCancel] = useState(false);
  const [cancelProgress, setCancelProgress] = useState(0);
  const cancelIntervalRef = useRef<number | null>(null);

  const [pressingArchiveId, setPressingArchiveId] = useState<string | null>(null);
  const [archiveProgress, setArchiveProgress] = useState(0);
  const archiveIntervalRef = useRef<number | null>(null);

  // Safety checks for props
  const safeSetupParts = Array.isArray(setupParticipants) ? setupParticipants : [];
  const safeHistory = Array.isArray(tournamentHistory) ? tournamentHistory : [];
  const safeRegPlayers = Array.isArray(registeredPlayers) ? registeredPlayers : [];

  const addParticipant = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (safeSetupParts.some(p => p && p.name === trimmed)) return;
    setSetupParticipants([...safeSetupParts, { id: Math.random().toString(36).substr(2, 9), name: trimmed }]);
    setNewParticipantName('');
  };

  const isProtected = (id: string | null, parts: Participant[]) => {
    if (!id || !Array.isArray(parts)) return false;
    const p = parts.find(part => part && part.id === id);
    const protectedPlayerNames = settings?.protectedPlayers || [];
    return p && protectedPlayerNames.includes(p.name);
  };

  const totalExpectedRounds = useMemo(() => {
    if (!tournamentData || !Array.isArray(tournamentData.participants) || tournamentData.participants.length < 2) return 0;
    return Math.ceil(Math.log2(tournamentData.participants.length));
  }, [tournamentData]);

  const createRound = (playerIds: string[], roundNum: number, currentWinsNeeded: number, currentEntryFee: number, currentPaidIds: string[], allParticipants: Participant[]): TournamentData => {
    const shuffled = [...(playerIds || [])].sort(() => Math.random() - 0.5);
    let protectedPool = shuffled.filter(id => isProtected(id, allParticipants));
    let regularPool = shuffled.filter(id => !isProtected(id, allParticipants));

    let byePlayerId: string | null = null;
    const totalCount = protectedPool.length + regularPool.length;
    if (totalCount % 2 !== 0) {
      if (protectedPool.length > 0) byePlayerId = protectedPool.pop() || null;
      else byePlayerId = regularPool.pop() || null;
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
      participants: allParticipants || [],
      currentRoundMatches: matches,
      roundHistory: tournamentData?.roundHistory || [],
      roundNumber: roundNum,
      status: 'ACTIVE',
      winnerId: null,
      byePlayerId,
      winnersPool: [],
      winsNeeded: currentWinsNeeded,
      entryFee: currentEntryFee,
      paidParticipantIds: currentPaidIds || [],
      timestamp: tournamentData?.timestamp || Date.now()
    };
  };

  const startTournament = () => {
    if (safeSetupParts.length < 2) return;
    const initialIds = safeSetupParts.map(p => p.id);
    const newTournament = createRound(initialIds, 1, winsNeeded, entryFee, [], safeSetupParts);
    setTournamentData(newTournament);
  };

  const proceedToNextRound = () => {
    if (!tournamentData || !Array.isArray(tournamentData.currentRoundMatches)) return;
    
    const winnersFromMatches = tournamentData.currentRoundMatches
      .filter(m => m && m.winnerId !== null)
      .map(m => m.winnerId as string);
    
    const pool = [...winnersFromMatches];
    if (tournamentData.byePlayerId) pool.push(tournamentData.byePlayerId);
    
    const currentRoundRecord = { 
      matches: tournamentData.currentRoundMatches, 
      byeId: tournamentData.byePlayerId 
    };
    const newHistory = [...(tournamentData.roundHistory || []), currentRoundRecord];

    if (pool.length === 1) {
       setTournamentData({
          ...tournamentData,
          roundHistory: newHistory,
          status: 'FINISHED',
          winnerId: pool[0]
       });
    } else if (pool.length > 1) {
       const nextRound = createRound(pool, tournamentData.roundNumber + 1, tournamentData.winsNeeded, tournamentData.entryFee, tournamentData.paidParticipantIds, tournamentData.participants);
       setTournamentData({
         ...nextRound,
         roundHistory: newHistory
       });
    }
  };

  const updateWin = (matchId: string, playerNum: 1 | 2, delta: number) => {
    if (!tournamentData || !Array.isArray(tournamentData.currentRoundMatches)) return;
    const targetWins = tournamentData.winsNeeded || 2;

    const newMatches = tournamentData.currentRoundMatches.map(m => {
      if (m && m.id === matchId) {
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

    setTournamentData({
      ...tournamentData,
      currentRoundMatches: newMatches
    });
  };

  const togglePayment = (playerId: string) => {
    if (!tournamentData) return;
    const currentPaidIds = Array.isArray(tournamentData.paidParticipantIds) ? tournamentData.paidParticipantIds : [];
    const isPaid = currentPaidIds.includes(playerId);
    const newPaidIds = isPaid 
      ? currentPaidIds.filter(id => id !== playerId)
      : [...currentPaidIds, playerId];
    
    setTournamentData({
      ...tournamentData,
      paidParticipantIds: newPaidIds
    });
  };

  const archiveTournamentAction = () => {
    if (!tournamentData) return;
    setTournamentHistory([tournamentData, ...safeHistory]);
    setTournamentData(null);
    setSetupParticipants([]);
  };

  const startCancelPress = () => {
    setIsPressingCancel(true);
    setCancelProgress(0);
    const startTime = Date.now();
    cancelIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setCancelProgress(progress);
      if (elapsed >= 1000) {
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
    archiveIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setArchiveProgress(progress);
      if (elapsed >= 2000) {
        stopDeleteArchivePress();
        setTournamentHistory(safeHistory.filter(tHist => tHist && tHist.id !== id));
      }
    }, 20);
  };

  const stopDeleteArchivePress = () => {
    if (archiveIntervalRef.current) clearInterval(archiveIntervalRef.current);
    setPressingArchiveId(null);
    setArchiveProgress(0);
  };

  const getPlayerName = (id: string | null, participants: Participant[] = []) => {
    if (!id || !Array.isArray(participants)) return "---";
    const p = participants.find(part => part && part.id === id);
    return p ? p.name : "Unknown";
  };

  const formatCurrency = (val: number) => val.toLocaleString() + " IQD";

  const renderSetup = () => (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} p-4`}>
           <div className="px-4 py-2 bg-indigo-600 rounded-2xl flex items-center gap-2 shadow-lg border border-white/10">
              <Users size={18} className="text-white" />
              <span className="text-lg font-black text-white">{safeSetupParts.length}</span>
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
               onKeyPress={(e) => e.key === 'Enter' && addParticipant(newParticipantName)}
               placeholder={t.playerName}
               className={`flex-1 border rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 font-bold text-base ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
             />
             <button onClick={() => addParticipant(newParticipantName)} className="bg-emerald-600 hover:bg-emerald-500 text-white w-14 h-14 rounded-2xl transition-all shadow-xl flex items-center justify-center shrink-0 active:scale-95">
               <Plus size={32} />
             </button>
          </div>

          <div className={`border-t pt-6 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
             <p className={`text-[9px] font-black text-slate-500 uppercase mb-4 ${isRTL ? 'text-right' : ''}`}>Selection Pool</p>
             <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto px-1 custom-scrollbar">
                {safeSetupParts.map(p => p && (
                  <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center gap-3 truncate">
                       <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0">#</span>
                       <span className="text-sm font-bold truncate">{p.name}</span>
                    </div>
                    <button onClick={() => setSetupParticipants(safeSetupParts.filter(lp => lp && lp.id !== p.id))} className="text-slate-500 hover:text-rose-500 p-2"><X size={16} /></button>
                  </div>
                ))}
                {safeSetupParts.length === 0 && (
                  <div className="py-8 text-center text-slate-500 italic text-xs">{t.noParticipants}</div>
                )}
             </div>
          </div>

          <div className={`border-t pt-6 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
             <p className={`text-[9px] font-black text-slate-500 uppercase mb-4 ${isRTL ? 'text-right' : ''}`}>Quick Add Registered Players</p>
             <div className="flex flex-wrap gap-2">
                {safeRegPlayers.filter(rp => rp && !safeSetupParts.some(sp => sp && sp.name === rp)).slice(0, 15).map(rp => (
                  <button 
                    key={rp} 
                    onClick={() => addParticipant(rp)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-400 hover:text-emerald-400 hover:border-emerald-500 transition-all flex items-center gap-1.5"
                  >
                    <UserPlus size={10} /> {rp}
                  </button>
                ))}
             </div>
          </div>

          <button 
            disabled={safeSetupParts.length < 2}
            onClick={startTournament}
            className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${
              safeSetupParts.length < 2 ? 'bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            <Shuffle size={24} /> {t.startTournament}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className={`text-sm font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <Archive size={18} /> {t.tournamentArchive}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {safeHistory.map((hist, idx) => {
             if (!hist) return null;
             const champion = (hist.participants || []).find(p => p && p.id === hist.winnerId);
             const isDeleting = pressingArchiveId === hist.id;
             return (
               <div key={hist.id} className={`p-6 rounded-[2rem] border relative overflow-hidden transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-lg'}`}>
                  <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <div className={isRTL ? 'text-right' : ''}>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.champion}</p>
                        <h5 className="text-xl font-black text-white">{champion?.name || '---'}</h5>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{new Date(hist.timestamp).toLocaleDateString()}</p>
                     </div>
                     <button 
                        onMouseDown={() => startDeleteArchivePress(hist.id)} onMouseUp={stopDeleteArchivePress} onMouseLeave={stopDeleteArchivePress}
                        className="relative p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all overflow-hidden"
                     >
                        {isDeleting && <div className="absolute bottom-0 left-0 h-full bg-rose-500/40 transition-all ease-linear" style={{ width: `${archiveProgress}%` }} />}
                        <Trash2 size={18} className="relative z-10" />
                     </button>
                  </div>
                  <div className={`flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-tighter ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <div className="flex items-center gap-1.5"><Users size={12} /> {(hist.participants || []).length} Players</div>
                     <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                     <div className="flex items-center gap-1.5"><Zap size={12} /> {hist.roundNumber} Rounds</div>
                  </div>
               </div>
             );
           })}
           {safeHistory.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[2rem] font-bold italic opacity-30">
                {t.noArchivedTournaments}
             </div>
           )}
        </div>
      </div>
    </div>
  );

  const renderActive = () => {
    if (!tournamentData || !Array.isArray(tournamentData.currentRoundMatches)) return null;
    const paidIds = Array.isArray(tournamentData.paidParticipantIds) ? tournamentData.paidParticipantIds : [];
    const totalCollected = paidIds.length * (tournamentData.entryFee || 0);
    const matchesFinished = tournamentData.currentRoundMatches.every(m => m && m.winnerId !== null);

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
                        <Users size={12} /> {(tournamentData.participants || []).length} Players
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
                if (!match) return null;
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
                   {(tournamentData.participants || []).length}
                 </span>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(tournamentData.participants || []).map(p => {
                  if (!p) return null;
                  const isPaid = paidIds.includes(p.id);
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isPaid ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-sm') : (isDark ? 'bg-slate-900/50 border-slate-700 opacity-60' : 'bg-slate-50 border-slate-100')} ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                          {p.name ? p.name[0] : '?'}
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

            <div className={`p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30`}>
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{t.tournamentRevenue}</p>
               <h4 className="text-3xl font-black">{formatCurrency(totalCollected)}</h4>
               <div className="h-px bg-white/20 my-4"></div>
               <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                  <span>Entry: {formatCurrency(tournamentData.entryFee)}</span>
                  <span>Paid: {paidIds.length}/{tournamentData.participants.length}</span>
               </div>
            </div>
          </div>
        </div>

        {showSummary && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="w-full max-w-6xl h-full flex flex-col space-y-6">
                <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Layout size={24} /></div>
                      <h3 className="text-2xl font-black text-white">{t.bracketSummary}</h3>
                   </div>
                   <button onClick={() => setShowSummary(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-x-auto flex items-start gap-8 p-8 custom-scrollbar">
                   {/* Current Round */}
                   <div className="space-y-6 min-w-[280px]">
                      <div className="px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black text-white uppercase text-center">{t.round} {tournamentData.roundNumber} (Live)</div>
                      {tournamentData.currentRoundMatches.map(m => (
                        <div key={m.id} className="p-4 bg-slate-800 border border-slate-700 rounded-2xl space-y-2">
                           <div className={`flex justify-between text-xs ${m.winnerId === m.p1Id ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                              <span>{getPlayerName(m.p1Id, tournamentData.participants)}</span>
                              <span>{m.p1Wins}</span>
                           </div>
                           <div className="h-px bg-slate-700"></div>
                           <div className={`flex justify-between text-xs ${m.winnerId === m.p2Id ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                              <span>{getPlayerName(m.p2Id, tournamentData.participants)}</span>
                              <span>{m.p2Wins}</span>
                           </div>
                        </div>
                      ))}
                      {tournamentData.byePlayerId && (
                        <div className="p-4 bg-indigo-500/10 border border-dashed border-indigo-500/30 rounded-2xl text-[10px] font-black text-indigo-400 text-center">
                          {getPlayerName(tournamentData.byePlayerId, tournamentData.participants)} (BYE)
                        </div>
                      )}
                   </div>

                   {/* History Rounds */}
                   {[...tournamentData.roundHistory].reverse().map((round, rIdx) => (
                      <div key={rIdx} className="space-y-6 min-w-[280px] opacity-60">
                         <div className="px-4 py-2 bg-slate-700 rounded-xl text-[10px] font-black text-white uppercase text-center">{t.round} {tournamentData.roundHistory.length - rIdx}</div>
                         {round.matches.map(m => (
                           <div key={m.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                              <div className={`flex justify-between text-xs ${m.winnerId === m.p1Id ? 'text-emerald-400 font-bold' : 'text-slate-50'}`}>
                                 <span>{getPlayerName(m.p1Id, tournamentData.participants)}</span>
                                 <span>{m.p1Wins}</span>
                              </div>
                              <div className="h-px bg-slate-800"></div>
                              <div className={`flex justify-between text-xs ${m.winnerId === m.p2Id ? 'text-emerald-400 font-bold' : 'text-slate-50'}`}>
                                 <span>{getPlayerName(m.p2Id, tournamentData.participants)}</span>
                                 <span>{m.p2Wins}</span>
                              </div>
                           </div>
                         ))}
                         {round.byeId && (
                           <div className="p-4 bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl text-[10px] font-black text-slate-500 text-center">
                             {getPlayerName(round.byeId, tournamentData.participants)} (BYE)
                           </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderFinished = () => {
    if (!tournamentData || !Array.isArray(tournamentData.participants)) return null;
    const champion = tournamentData.participants.find(p => p && p.id === tournamentData.winnerId);
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
               <p className="text-5xl font-black text-amber-400 tracking-tight">{champion?.name || '---'}</p>
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
      </div>
    );
  };

  const hasTournament = tournamentData && Object.keys(tournamentData).length > 0;

  return (
    <div className="p-2 relative h-full">
      {!hasTournament && renderSetup()}
      {tournamentData?.status === 'ACTIVE' && renderActive()}
      {tournamentData?.status === 'FINISHED' && renderFinished()}
    </div>
  );
};

export default TournamentManager;

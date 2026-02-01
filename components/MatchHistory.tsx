
import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { Swords, Clock, LayoutGrid, Search, Lock } from 'lucide-react';

interface MatchHistoryProps {
  transactions: Transaction[];
  t: any;
  isRTL: boolean;
  isDark: boolean;
  isAdmin: boolean;
}

interface IndividualGame {
  playerName: string;
  timestamp: number;
  tableNumber: number;
  transactionId: string;
}

interface MatchSession {
  id: string;
  tableNumber: number;
  timestamp: number;
  players: string[];
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ transactions, t, isRTL, isDark, isAdmin }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const matches = useMemo(() => {
    // 1. Flatten all games from transactions
    const allGames: IndividualGame[] = [];
    transactions.forEach(tr => {
      if (tr.gameStartTimes && tr.gameTables) {
        tr.gameStartTimes.forEach((time, idx) => {
          allGames.push({
            playerName: tr.playerName,
            timestamp: time,
            tableNumber: tr.gameTables[idx] || 0,
            transactionId: tr.id
          });
        });
      }
    });

    // 2. Sort by time
    allGames.sort((a, b) => b.timestamp - a.timestamp);

    // 3. Group by table and close proximity (within 3 minutes)
    const sessions: MatchSession[] = [];
    const processed = new Set<string>();

    allGames.forEach((game, i) => {
      const key = `${game.transactionId}-${game.timestamp}`;
      if (processed.has(key)) return;

      const currentSession: MatchSession = {
        id: Math.random().toString(36).substr(2, 9),
        tableNumber: game.tableNumber,
        timestamp: game.timestamp,
        players: [game.playerName]
      };
      processed.add(key);

      // Look for others on the same table within 3 minutes
      for (let j = 0; j < allGames.length; j++) {
        const other = allGames[j];
        const otherKey = `${other.transactionId}-${other.timestamp}`;
        if (i === j || processed.has(otherKey)) continue;

        const timeDiff = Math.abs(game.timestamp - other.timestamp);
        if (game.tableNumber === other.tableNumber && timeDiff < 180000) { // 3 minutes
          if (!currentSession.players.includes(other.playerName)) {
            currentSession.players.push(other.playerName);
          }
          processed.add(otherKey);
        }
      }

      // Only include sessions where more than 1 person played together
      if (currentSession.players.length > 1) {
        sessions.push(currentSession);
      }
    });

    return sessions.filter(s => 
      s.players.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [transactions, searchTerm]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(isRTL ? 'ku-Arab-IQ' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 relative">
      {/* Restricted View Blur Overlay */}
      {!isAdmin && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center animate-in fade-in duration-700">
           <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-8 rounded-[2.5rem] shadow-2xl max-w-sm flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <Lock size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                  {isRTL ? 'دەستگەیشتن سنووردارە' : t.accessRestricted}
                </h3>
                <p className="text-slate-400 text-sm mt-1 font-medium leading-relaxed">
                  {isRTL ? 'تەنها بەڕێوەبەر دەتوانێت مێژووی یارییەکان ببینێت.' : 'Only administrators can view the detailed match history logs.'}
                </p>
              </div>
           </div>
        </div>
      )}

      {/* Header Container */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-800 border border-slate-700 rounded-[2rem] shadow-lg ${isRTL ? 'flex-row-reverse' : ''} ${!isAdmin ? 'blur-sm pointer-events-none opacity-50' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
           <div className="bg-rose-500/10 p-3 rounded-2xl text-rose-400">
             <Swords size={24} />
           </div>
           <div>
             <h3 className="text-lg font-black text-white">{t.playedTogether}</h3>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.matches}</p>
           </div>
        </div>
        
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
          <input 
            type="text" 
            placeholder={t.searchPlayers}
            value={searchTerm}
            disabled={!isAdmin}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`bg-slate-900 border border-slate-700 rounded-2xl py-3 text-white w-full md:w-64 focus:outline-none focus:border-rose-500 transition-all font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
          />
        </div>
      </div>

      {/* Matches Grid with Blur filter for staff */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-700 ${!isAdmin ? 'blur-[12px] pointer-events-none select-none grayscale opacity-30 scale-[0.98]' : ''}`}>
        {matches.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4">
            <Swords size={48} className="opacity-10" />
            <p className="font-bold opacity-40">{isRTL ? 'هیچ یارییەکی پێکەوەیی نەدۆزرایەوە' : 'No matches found.'}</p>
          </div>
        ) : matches.map(match => (
          <div key={match.id} className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden group ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-xl border border-slate-700 shadow-inner">
                <LayoutGrid size={14} className="text-indigo-400" />
                <span className="text-xs font-black text-white">M{match.tableNumber}</span>
              </div>
              <div className={`flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Clock size={12} />
                {formatDate(match.timestamp)}
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-center gap-4">
                {match.players.map((player, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg ${idx % 2 === 0 ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                        {player[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-black text-white truncate w-full text-center">{player}</span>
                    </div>
                    {idx < match.players.length - 1 && (
                      <div className="text-slate-600 font-black italic text-xs mt-[-20px]">VS</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
               <div className="h-1 w-12 bg-rose-500/20 rounded-full group-hover:w-24 transition-all duration-500"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchHistory;

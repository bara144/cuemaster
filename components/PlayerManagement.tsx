
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Trash2, Edit3, Check, X, Users2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Transaction, Session } from '../types';

interface PlayerManagementProps {
  players: string[];
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  t: any;
  isRTL: boolean;
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({ 
  players, 
  setPlayers, 
  setTransactions, 
  setSessions, 
  t, 
  isRTL 
}) => {
  const [filter, setFilter] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // States for long press logic
  const [pressingPlayer, setPressingPlayer] = useState<string | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => p.toLowerCase().includes(filter.toLowerCase()));
  }, [players, filter]);

  const performFullDeletion = () => {
    if (!confirmDeleteName) return;
    
    const name = confirmDeleteName;
    setPlayers(prev => prev.filter(p => p !== name));
    setTransactions(prev => prev.filter(tr => tr.playerName !== name));
    setSessions(prev => prev.filter(sess => sess.playerName !== name));
    
    setConfirmDeleteName(null);
    setPressingPlayer(null);
    setPressProgress(0);
  };

  const startPress = (name: string) => {
    setPressingPlayer(name);
    setPressProgress(0);
    
    const startTime = Date.now();
    const duration = 1000; // 1 second

    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPressProgress(progress);
      
      if (elapsed >= duration) {
        cancelPress();
        setConfirmDeleteName(name); // Show confirmation instead of immediate delete
      }
    }, 20);
  };

  const cancelPress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPressingPlayer(null);
    setPressProgress(0);
  };

  const startEditing = (index: number, name: string) => {
    setEditingIndex(index);
    setEditValue(name);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleRename = (originalName: string) => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === originalName) {
      cancelEditing();
      return;
    }

    if (players.includes(trimmedValue)) {
      alert(t.alreadyActive || "Player already exists.");
      return;
    }

    setPlayers(prev => prev.map(p => p === originalName ? trimmedValue : p));
    setTransactions(prev => prev.map(tr => tr.playerName === originalName ? { ...tr, playerName: trimmedValue } : tr));
    setSessions(prev => prev.map(sess => sess.playerName === originalName ? { ...sess, playerName: trimmedValue } : sess));

    cancelEditing();
  };

  return (
    <div className="space-y-6">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users2 size={24} className="text-emerald-500" />
            {t.managePlayers}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t.holdToDelete}
          </p>
        </div>
        <div className="relative">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-3' : 'left-3'}`} size={18} />
          <input 
            type="text" 
            placeholder={t.searchPlayers}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={`bg-slate-800 border border-slate-700 rounded-xl py-2 text-white w-full md:w-64 focus:outline-none focus:border-emerald-500 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
          />
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700">
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>#</th>
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.playerName}</th>
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-left' : 'text-right'}`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    {t.noPlayers}
                  </td>
                </tr>
              ) : filteredPlayers.map((player, idx) => (
                <tr key={player} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-sm">{idx + 1}</td>
                  <td className="px-6 py-4">
                    {editingIndex === idx ? (
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <input 
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRename(player)}
                          autoFocus
                          className={`bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-1 text-white focus:outline-none w-full max-w-[200px] ${isRTL ? 'text-right' : ''}`}
                        />
                        <button onClick={() => handleRename(player)} className="text-emerald-500 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors">
                          <Check size={18} />
                        </button>
                        <button onClick={cancelEditing} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-white text-lg">{player}</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <button 
                        onClick={() => startEditing(idx, player)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        title={t.editPlayer}
                      >
                        <Edit3 size={18} />
                      </button>
                      
                      {/* Hold to Delete Button (1 second) */}
                      <button 
                        onMouseDown={() => startPress(player)}
                        onMouseUp={cancelPress}
                        onMouseLeave={cancelPress}
                        onTouchStart={() => startPress(player)}
                        onTouchEnd={cancelPress}
                        className="relative p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all overflow-hidden group"
                        title={t.holdToDelete}
                      >
                        {pressingPlayer === player && (
                          <div 
                            className="absolute bottom-0 left-0 h-full bg-rose-500/40 transition-all ease-linear"
                            style={{ width: `${pressProgress}%` }}
                          />
                        )}
                        <Trash2 size={18} className="relative z-10" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {confirmDeleteName && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-rose-500/30 shadow-2xl shadow-rose-500/10 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t.confirmAction}</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                {t.deleteWarning} <br/>
                <span className="text-rose-400 font-bold">({confirmDeleteName})</span>
              </p>
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button 
                  onClick={() => setConfirmDeleteName(null)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={performFullDeletion}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20"
                >
                  {t.deletePermanently}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" size={18} />
        <div className="text-[11px] text-amber-200/70 leading-relaxed">
          <p className="font-bold mb-1">{isRTL ? 'ئاگاداری بۆ بەڕێوبەر:' : 'Admin Warning:'}</p>
          {t.deleteWarning}
        </div>
      </div>
    </div>
  );
};

export default PlayerManagement;

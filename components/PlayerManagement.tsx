
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Trash2, Edit3, Check, X, Users2, AlertTriangle, AlertCircle, Plus, UserPlus, Loader2 } from 'lucide-react';
import { Transaction, Session } from '../types';
import { updateHallDataAtomic, syncToCloud } from '../services/firebaseService';

interface PlayerManagementProps {
  players: string[];
  setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  t: any;
  isRTL: boolean;
  hallId?: string; // Needed for atomic updates
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({ 
  players = [], 
  setPlayers, 
  setTransactions, 
  setSessions, 
  t, 
  isRTL,
  hallId
}) => {
  const [filter, setFilter] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const filteredPlayers = useMemo(() => {
    return (players || []).filter(p => p && p.toLowerCase().includes(filter.toLowerCase()));
  }, [players, filter]);

  const addPlayerAtomic = async () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed || !hallId) return;
    if (players.includes(trimmed)) {
      alert(t.alreadyActive);
      return;
    }

    setIsAdding(true);
    try {
      // 1. Local state update
      setPlayers(prev => [...prev, trimmed]);
      // 2. Atomic Cloud Sync using arrayUnion
      await updateHallDataAtomic('players', trimmed, hallId);
      setNewPlayerName('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRename = async (originalName: string) => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === originalName) {
      setEditingIndex(null);
      return;
    }

    const updatedList = players.map(p => p === originalName ? trimmedValue : p);
    setPlayers(updatedList);
    
    // Sync whole list for rename as it's not a simple addition
    if (hallId) {
      await syncToCloud('players', updatedList, hallId);
    }
    
    setTransactions(prev => prev.map(tr => tr.playerName === originalName ? { ...tr, playerName: trimmedValue } : tr));
    setSessions(prev => prev.map(sess => sess.playerName === originalName ? { ...sess, playerName: trimmedValue } : sess));
    setEditingIndex(null);
  };

  const deletePlayer = async (name: string) => {
    if (!confirm(t.confirmDeletePlayer)) return;
    const updated = players.filter(p => p !== name);
    setPlayers(updated);
    if (hallId) await syncToCloud('players', updated, hallId);
  };

  return (
    <div className="space-y-6">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Users2 size={24} className="text-emerald-500" />
          {t.managePlayers}
        </h3>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
             <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-3' : 'left-3'}`} size={18} />
             <input type="text" placeholder={t.searchPlayers} value={filter} onChange={(e) => setFilter(e.target.value)} className={`bg-slate-800 border border-slate-700 rounded-xl py-2 px-10 text-white w-full md:w-64 focus:outline-none ${isRTL ? 'text-right' : ''}`} />
          </div>
        </div>
      </div>

      {/* Atomic Add Section */}
      <div className={`p-6 bg-slate-800 border border-slate-700 rounded-2xl flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <input 
          type="text" 
          value={newPlayerName} 
          onChange={(e) => setNewPlayerName(e.target.value)} 
          placeholder={t.addNewPlayer} 
          className={`flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold focus:border-emerald-500 outline-none ${isRTL ? 'text-right' : ''}`}
        />
        <button 
          onClick={addPlayerAtomic} 
          disabled={isAdding || !newPlayerName.trim()} 
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-black transition-all flex items-center gap-2"
        >
          {isAdding ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
          {t.addItem}
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-700 font-bold text-slate-500 text-xs">
              <th className="px-6 py-4">#</th>
              <th className="px-6 py-4">{t.playerName}</th>
              <th className="px-6 py-4 text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredPlayers.map((player, idx) => (
              <tr key={player} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 text-slate-500 text-sm">{idx + 1}</td>
                <td className="px-6 py-4">
                  {editingIndex === idx ? (
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(player)} onKeyPress={(e) => e.key === 'Enter' && handleRename(player)} className="bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-white outline-none" />
                  ) : <span className="font-semibold text-white">{player}</span>}
                </td>
                <td className="px-6 py-4 text-right space-x-2 space-x-reverse">
                  <button onClick={() => { setEditingIndex(idx); setEditValue(player); }} className="p-2 text-slate-400 hover:text-blue-400"><Edit3 size={18} /></button>
                  <button onClick={() => deletePlayer(player)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerManagement;

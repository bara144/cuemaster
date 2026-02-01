
import React, { useMemo, useState } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { Search, UserCheck, AlertCircle, TrendingDown, Clock, X, Calculator, Banknote } from 'lucide-react';

interface DebtManagerProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  isAdmin: boolean;
  t: any;
  isRTL: boolean;
}

interface DebtItem {
  id: string;
  timestamp: number;
  amount: number;
}

interface GroupedDebt {
  playerName: string;
  totalAmount: number;
  transactionIds: string[];
  items: DebtItem[];
}

const DebtManager: React.FC<DebtManagerProps> = ({ transactions, setTransactions, isAdmin, t, isRTL }) => {
  const [filter, setFilter] = useState('');
  const [settleModalGroup, setSettleModalGroup] = useState<GroupedDebt | null>(null);
  const [settleType, setSettleType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<number>(0);

  const activeDebts = useMemo(() => {
    return transactions.filter(t => t.paymentMethod === 'DEBT' && !t.isSettled);
  }, [transactions]);

  const groupedDebts = useMemo(() => {
    const groups: Record<string, GroupedDebt> = {};
    
    activeDebts.forEach(debt => {
      const name = debt.playerName;
      if (!groups[name]) {
        groups[name] = {
          playerName: name,
          totalAmount: 0,
          transactionIds: [],
          items: []
        };
      }
      groups[name].totalAmount += debt.totalPaid;
      groups[name].transactionIds.push(debt.id);
      groups[name].items.push({
        id: debt.id,
        timestamp: debt.timestamp,
        amount: debt.totalPaid
      });
    });
    
    Object.values(groups).forEach(g => {
      g.items.sort((a, b) => b.timestamp - a.timestamp);
    });

    return Object.values(groups).filter(g => 
      g.playerName.toLowerCase().includes(filter.toLowerCase())
    );
  }, [activeDebts, filter]);

  const totalOutstanding = useMemo(() => {
    return activeDebts.reduce((acc, d) => acc + d.totalPaid, 0);
  }, [activeDebts]);

  const handleSettle = () => {
    if (!settleModalGroup) return;

    let amountRemaining = settleType === 'FULL' ? settleModalGroup.totalAmount : partialAmount;
    if (amountRemaining <= 0) return;

    // We process from oldest to newest debt to pay them off sequentially
    const playerDebtsSorted = transactions
      .filter(t => settleModalGroup.transactionIds.includes(t.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    const updatedTransactions = [...transactions];
    const newTransactions: Transaction[] = [];

    const now = Date.now();

    for (const debt of playerDebtsSorted) {
      if (amountRemaining <= 0) break;

      const debtIdx = updatedTransactions.findIndex(ut => ut.id === debt.id);
      if (debtIdx === -1) continue;

      if (amountRemaining >= debt.totalPaid) {
        // Full settlement of this specific transaction
        // Update timestamp to "now" so it counts in today's Daily Income
        updatedTransactions[debtIdx] = { ...debt, isSettled: true, timestamp: now };
        amountRemaining -= debt.totalPaid;
      } else {
        // Partial settlement of this specific transaction - Split it
        const paidPart: Transaction = {
          ...debt,
          id: Math.random().toString(36).substr(2, 9),
          totalPaid: amountRemaining,
          isSettled: true,
          timestamp: now
        };
        
        updatedTransactions[debtIdx] = { 
          ...debt, 
          totalPaid: debt.totalPaid - amountRemaining 
        };

        newTransactions.push(paidPart);
        amountRemaining = 0;
      }
    }

    setTransactions([...updatedTransactions, ...newTransactions]);
    setSettleModalGroup(null);
    setPartialAmount(0);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString() + " IQD";
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(isRTL ? 'ku-Arab-IQ' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t.totalDebt}</p>
            <p className="text-3xl font-black text-amber-500">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="bg-amber-500/10 p-4 rounded-2xl">
            <TrendingDown className="text-amber-500" size={32} />
          </div>
        </div>
      </div>

      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-xl font-semibold text-white">{t.debts}</h3>
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
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.player}</th>
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.dateTime}</th>
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-right' : ''}`}>{t.totalDebt}</th>
                <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest ${isRTL ? 'text-left' : 'text-right'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {groupedDebts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="text-slate-700" size={48} />
                      <p>{t.noDebts}</p>
                    </div>
                  </td>
                </tr>
              ) : groupedDebts.map(group => (
                <tr key={group.playerName} className="hover:bg-slate-700/30 transition-colors group/row">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-lg">{group.playerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {group.transactionIds.length} {t.debts.toLowerCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar min-w-[280px]">
                      {group.items.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between gap-4 text-slate-400 text-[11px] bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-amber-500/30 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock size={10} className="text-slate-500" />
                            {formatDate(item.timestamp)}
                          </div>
                          <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xl font-black text-amber-400">{formatCurrency(group.totalAmount)}</span>
                  </td>
                  <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                    <button 
                      onClick={() => {
                        setSettleModalGroup(group);
                        setSettleType('FULL');
                        setPartialAmount(0);
                      }}
                      className="flex items-center gap-2 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-xl transition-all border border-emerald-500/20 active:scale-95 text-sm font-bold ml-auto mr-0"
                    >
                      <UserCheck size={18} /> {t.settleDebt}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Modal */}
      {settleModalGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className={`p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-bold">{t.settleDebt}</h3>
              <button onClick={() => setSettleModalGroup(null)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-8">
              <div className="mb-8 text-center">
                <p className="text-slate-400 text-sm mb-1">{t.player}</p>
                <h4 className="text-2xl font-black text-white">{settleModalGroup.playerName}</h4>
                <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-700 inline-block">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.totalDebt}</p>
                  <p className="text-2xl font-black text-amber-500">{formatCurrency(settleModalGroup.totalAmount)}</p>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-4 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button 
                  onClick={() => setSettleType('FULL')}
                  className={`p-4 rounded-xl border font-bold transition-all text-sm flex flex-col items-center gap-2 ${settleType === 'FULL' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <UserCheck size={20} />
                  {t.fullSettlement}
                </button>
                <button 
                  onClick={() => setSettleType('PARTIAL')}
                  className={`p-4 rounded-xl border font-bold transition-all text-sm flex flex-col items-center gap-2 ${settleType === 'PARTIAL' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <Calculator size={20} />
                  {t.partialSettlement}
                </button>
              </div>

              {settleType === 'PARTIAL' && (
                <div className="space-y-4 mb-8 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className={isRTL ? 'text-right' : ''}>
                    <label className="block text-sm font-medium text-slate-400 mb-2">{t.amountToPay}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="250"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(Math.min(settleModalGroup.totalAmount, Number(e.target.value)))}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-4 text-white focus:outline-none focus:border-blue-500 text-xl font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                        placeholder="0"
                      />
                      <div className={`absolute top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs ${isRTL ? 'right-4' : 'left-4'}`}>IQD</div>
                    </div>
                  </div>
                  <div className={`flex justify-between items-center text-sm p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-500">{t.remainingAfter}:</span>
                    <span className="text-white font-bold">{formatCurrency(settleModalGroup.totalAmount - partialAmount)}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSettle}
                disabled={settleType === 'PARTIAL' && partialAmount <= 0}
                className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  settleType === 'PARTIAL' && partialAmount <= 0 ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                }`}
              >
                <Banknote size={20} />
                {t.confirmPayment}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtManager;

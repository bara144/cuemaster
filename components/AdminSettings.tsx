
import React, { useState } from 'react';
import { AppSettings, PrizeProbability, User, Role, MarketItem } from '../types';
import { Save, AlertCircle, Languages, Type, RefreshCcw, RotateCw, ShieldAlert, CheckCircle2, Trash2, Zap, MinusCircle, HelpCircle, Star, ShieldCheck, UserPlus, X, Database, Download, RotateCcw as ResetIcon, AlertTriangle, Mail, ShoppingBasket, Plus, DollarSign, Percent, ChevronRight, ChevronDown } from 'lucide-react';

interface AdminSettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  backups: any[];
  onRestore: (data: any) => void;
  setBackups: React.Dispatch<React.SetStateAction<any[]>>;
  t: any;
  currentUser: User | null;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, setSettings, backups = [], onRestore, setBackups, t, currentUser }) => {
  const [localSettings, setLocalSettings] = React.useState(settings);
  const [saved, setSaved] = React.useState(false);
  const [newProtected, setNewProtected] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<any>(null);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  const isSuperAdmin = currentUser?.role === Role.ADMIN;

  const handleSave = () => {
    setSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addProtectedPlayer = () => {
    const name = newProtected.trim();
    if (!name || (localSettings.protectedPlayers || []).includes(name)) return;
    setLocalSettings({
      ...localSettings,
      protectedPlayers: [...(localSettings.protectedPlayers || []), name]
    });
    setNewProtected('');
  };

  const removeProtectedPlayer = (name: string) => {
    setLocalSettings({
      ...localSettings,
      protectedPlayers: (localSettings.protectedPlayers || []).filter(p => p !== name)
    });
  };

  const resetFontSize = () => {
    setLocalSettings({ ...localSettings, playerNameFontSize: 20 });
  };

  const updatePrizeWeight = (prize: string, weight: PrizeProbability) => {
    const newWeights = { ...(localSettings.prizeWeights || {}), [prize]: weight };
    setLocalSettings({ ...localSettings, prizeWeights: newWeights });
  };

  const removePrizeGlobally = (prize: string) => {
    const newPrizes = (localSettings.wheelPrizes || []).filter(p => p !== prize);
    const { [prize]: _, ...newWeights } = (localSettings.prizeWeights || {});
    setLocalSettings({ ...localSettings, wheelPrizes: newPrizes, prizeWeights: newWeights });
  };

  const updateDiscountTier = (games: number, amount: number) => {
    const newTiers = { ...(localSettings.discountTiers || {}) };
    if (amount <= 0) delete newTiers[games];
    else newTiers[games] = amount;
    setLocalSettings({ ...localSettings, discountTiers: newTiers });
  };

  const downloadFullBackup = () => {
    const data = {
      sessions: JSON.parse(localStorage.getItem(`cuemaster_sessions_${currentUser?.hallId || 'global'}`) || '[]'),
      transactions: JSON.parse(localStorage.getItem(`cuemaster_transactions_${currentUser?.hallId || 'global'}`) || '[]'),
      users: JSON.parse(localStorage.getItem('cuemaster_users') || '[]'),
      settings: JSON.parse(localStorage.getItem(`cuemaster_settings_${currentUser?.hallId || 'global'}`) || '{}'),
      players: JSON.parse(localStorage.getItem(`cuemaster_players_${currentUser?.hallId || 'global'}`) || '[]'),
      attendance: JSON.parse(localStorage.getItem(`cuemaster_attendance_${currentUser?.hallId || 'global'}`) || '[]'),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BigBoss_Backup_${currentUser?.hallId || 'Global'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteBackup = (date: string) => {
    setBackups(prev => prev.filter(b => b && b.date !== date));
  };

  const isRTL = localSettings.language === 'ckb';
  const isDark = settings.theme === 'dark';

  const probOptions: { value: PrizeProbability, label: string, color: string, icon: React.ReactNode }[] = [
    { value: 'NEVER', label: t.probNever, color: 'text-rose-500', icon: <ShieldAlert size={14} /> },
    { value: 'RARE', label: t.probRare, color: 'text-amber-500', icon: <MinusCircle size={14} /> },
    { value: 'NORMAL', label: t.probNormal, color: 'text-blue-500', icon: <HelpCircle size={14} /> },
    { value: 'ENHANCED', label: t.probEnhanced, color: 'text-indigo-400', icon: <Star size={14} /> },
    { value: 'FREQUENT', label: t.probFrequent, color: 'text-emerald-500', icon: <Zap size={14} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Backups Management Section */}
      <div className={`border rounded-[2.5rem] overflow-hidden shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-8 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
           <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
               <Database size={28} />
             </div>
             <div className={isRTL ? 'text-right' : ''}>
                <h3 className="text-2xl font-black">{t.backups}</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">{t.autoBackup}</p>
             </div>
           </div>
        </div>

        <div className="p-8 space-y-8">
           <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl ${isDark ? 'bg-slate-900/50 border border-slate-700' : 'bg-slate-50 border border-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <h4 className="font-black text-white text-sm mb-1">{t.backupDesc}</h4>
                <p className="text-xs text-slate-500 font-medium">Auto-saves every day upon first use.</p>
              </div>
              <button 
                onClick={downloadFullBackup}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95"
              >
                <Download size={16} /> {t.downloadAll}
              </button>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {(backups || []).map((backup, idx) => backup && (
                <div key={idx} className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${isDark ? 'bg-slate-900/40 border-slate-700 hover:border-indigo-500/50' : 'bg-white border-slate-100 shadow-sm'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-xs font-black">
                        #{(backups || []).length - idx}
                      </div>
                      <div>
                        <p className="font-black text-white">{backup.date}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(backup.timestamp).toLocaleTimeString()}</p>
                      </div>
                   </div>

                   <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <button 
                        onClick={() => setShowRestoreConfirm(backup)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-xs font-black active:scale-95"
                      >
                        <ResetIcon size={14} /> {t.restore}
                      </button>
                      <button 
                        onClick={() => deleteBackup(backup.date)}
                        className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        <X size={18} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Hall Configuration Section */}
      <div className={`border rounded-[2.5rem] overflow-hidden shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-8 border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className="text-2xl font-black">{t.hallConfig}</h3>
          <p className="text-sm text-slate-500 mt-1">{t.languageNotice}</p>
        </div>

        <div className="p-8 space-y-12">
          {/* Reporting Configuration */}
          <div className="space-y-6">
            <h4 className={`text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Mail size={14} className="text-indigo-500" /> {isRTL ? 'ڕاپۆرتی ئیمەیڵ' : 'Email Reporting'}
            </h4>
            <div className={isRTL ? 'text-right' : ''}>
              <label className="block text-sm font-bold text-slate-400 mb-2">{isRTL ? 'ئیمەیڵی وەرگر' : 'Recipient Email'}</label>
              <input 
                type="email"
                placeholder="example@gmail.com"
                value={localSettings.reportEmail || ''}
                onChange={(e) => setLocalSettings({...localSettings, reportEmail: e.target.value})}
                className={`w-full border rounded-2xl px-6 py-4 transition-all focus:outline-none focus:border-indigo-500 font-black ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
              />
            </div>
          </div>

          <div className="space-y-6">
            <h4 className={`text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle size={14} /> {t.pricingRules}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={isRTL ? 'text-right' : ''}>
                <label className="block text-sm font-bold text-slate-400 mb-2">{t.pricePerGame}</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="500"
                    value={localSettings.pricePerGame}
                    onChange={(e) => setLocalSettings({...localSettings, pricePerGame: Number(e.target.value)})}
                    className={`w-full border rounded-2xl py-4 transition-all focus:outline-none focus:border-emerald-500 font-black ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                  />
                  <div className={`absolute top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs ${isRTL ? 'right-4' : 'left-4'}`}>IQD</div>
                </div>
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <label className="block text-sm font-bold text-slate-400 mb-2">{t.cashDiscount}</label>
                <input 
                  type="number"
                  max="100"
                  min="0"
                  value={localSettings.cashDiscountRate}
                  onChange={(e) => setLocalSettings({...localSettings, cashDiscountRate: Number(e.target.value)})}
                  className={`w-full border rounded-2xl px-6 py-4 transition-all focus:outline-none focus:border-emerald-500 font-black ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} ${isRTL ? 'text-right' : ''}`}
                />
              </div>
            </div>

            {/* NEW: Discount Tiers Management Section */}
            <div className={`mt-6 border border-indigo-500/20 rounded-[2rem] overflow-hidden ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
               <button 
                onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                className={`w-full flex items-center justify-between p-6 hover:bg-indigo-500/5 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
               >
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Percent size={20} />
                    </div>
                    <div className={isRTL ? 'text-right' : ''}>
                      <span className="block text-sm font-black text-white">{isRTL ? 'داشکاندنی بەردەوام (Tiers)' : 'Tiered Discounts'}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">{isRTL ? 'دیاریکردنی داشکاندن بۆ یارییەکان' : 'Configure discounts based on game count'}</span>
                    </div>
                  </div>
                  {showDiscountPanel ? <ChevronDown size={18} /> : <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''} />}
               </button>

               {showDiscountPanel && (
                 <div className="p-8 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                       <AlertCircle size={18} className="text-amber-500 shrink-0" />
                       <p className="text-[10px] text-amber-200/80 font-medium leading-relaxed italic">
                         {isRTL 
                          ? 'تێبینی: داشکاندن تەنها کاتێک کار دەکات کە کۆی پارەی یارییەکان ٣٠٠٠ دینار یان زیاتر بێت. لێرە دەتوانیت بۆ یاری ٤ تا ٢٥ داشکاندن دیاری بکەیت.'
                          : 'Note: Discounts only apply when the game subtotal is 3,000 IQD or more. You can define discounts for 4 to 25 games.'}
                       </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                       {Array.from({ length: 22 }, (_, i) => i + 4).map(num => (
                         <div key={num} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
                            <label className={`block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ${isRTL ? 'text-right' : ''}`}>{num} {t.gamesPlayed}</label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="250"
                                value={(localSettings.discountTiers || {})[num] || ''}
                                onChange={(e) => updateDiscountTier(num, Number(e.target.value))}
                                className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-2 text-xs font-black text-emerald-400 focus:outline-none focus:border-indigo-500 ${isRTL ? 'text-right' : ''}`}
                                placeholder="0"
                              />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          </div>

          {/* Tournament Protection Section - Restricted to Super Admin */}
          {isSuperAdmin && (
            <div className="space-y-6">
              <h4 className={`text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <ShieldCheck size={14} className="text-amber-500" /> {t.protectedPlayers}
              </h4>
              <div className={`bg-slate-900/50 p-6 rounded-3xl border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                 <p className="text-xs text-slate-400 mb-4">{t.protectedPlayersDesc}</p>
                 
                 <div className={`flex gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <input 
                      type="text"
                      value={newProtected}
                      onChange={(e) => setNewProtected(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addProtectedPlayer()}
                      placeholder={t.playerName}
                      className={`flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all ${isRTL ? 'text-right' : ''}`}
                    />
                    <button onClick={addProtectedPlayer} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-all active:scale-95">
                      <UserPlus size={20} />
                    </button>
                 </div>

                 <div className="flex flex-wrap gap-2">
                   {(localSettings.protectedPlayers || []).map(name => (
                     <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold">
                       {name}
                       <button onClick={() => removeProtectedPlayer(name)} className="hover:text-rose-500 transition-colors">
                         <X size={14} />
                       </button>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

          {/* Wheel Controls Section - Restricted to Super Admin */}
          {isSuperAdmin && (
            <div className="space-y-6">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h4 className={`text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <RotateCw size={14} /> {t.wheelSettings}
                </h4>
              </div>

              <div className="space-y-6">
                {(localSettings.wheelPrizes || []).map((prize, idx) => {
                  const currentWeight = (localSettings.prizeWeights || {})[prize] || 'NORMAL';
                  return (
                    <div key={idx} className={`rounded-3xl border p-6 transition-all hover:shadow-lg ${isDark ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center font-black text-xs text-indigo-500 shrink-0">
                            {idx + 1}
                          </div>
                          <h5 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{prize}</h5>
                        </div>
                        <button 
                          onClick={() => removePrizeGlobally(prize)}
                          className="p-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {probOptions.map((opt) => {
                          const isSelected = currentWeight === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => updatePrizeWeight(prize, opt.value)}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                                isSelected
                                  ? (isDark ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-105' : 'bg-emerald-600 border-emerald-500 text-white shadow-xl scale-105')
                                  : (isDark ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')
                              }`}
                            >
                              <div className={isSelected ? 'text-white' : opt.color}>
                                {opt.icon}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-tighter text-center line-clamp-1">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-6 pt-8 border-t border-slate-700/50">
            <h4 className={`text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Type size={14} /> {t.fontSize}
            </h4>
            
            <div className={`flex items-center gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1 space-y-4">
                <input 
                  type="range"
                  min="12"
                  max="40"
                  value={localSettings.playerNameFontSize}
                  onChange={(e) => setLocalSettings({...localSettings, playerNameFontSize: Number(e.target.value)})}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className={`flex justify-between text-[10px] font-bold text-slate-500 uppercase ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>12px</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-500/20">{localSettings.playerNameFontSize}px</span>
                  <span>40px</span>
                </div>
              </div>
              <button 
                onClick={resetFontSize}
                className="p-4 bg-slate-900 border border-slate-700 rounded-2xl text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center gap-2 text-xs font-bold"
                title={t.reset}
              >
                <RefreshCcw size={18} />
                <span className="hidden sm:inline">{t.reset}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6 pt-8 border-t border-slate-700/50">
             <h4 className={`text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Languages size={14} /> {t.language}
            </h4>
            <div className="grid grid-cols-2 gap-4">
               <button 
                type="button"
                onClick={() => setLocalSettings({...localSettings, language: 'en'})}
                className={`p-6 rounded-[1.5rem] border font-black text-lg transition-all ${localSettings.language === 'en' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-xl' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
               >
                 English
               </button>
               <button 
                type="button"
                onClick={() => setLocalSettings({...localSettings, language: 'ckb'})}
                className={`p-6 rounded-[1.5rem] border font-black text-lg transition-all ${localSettings.language === 'ckb' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-xl' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
               >
                 کوردی (سۆرانی)
               </button>
            </div>
          </div>

          <div className="pt-8">
             <button 
              onClick={handleSave}
              className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 ${
                saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              <Save size={24} />
              {saved ? t.changesSaved : t.saveConfig}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

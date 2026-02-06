
import React, { useState, useEffect, useMemo } from 'react';
import { User, Role } from '../types';
import { Shield, UserCircle, LogIn, TrendingUp, Lock, ArrowLeft, AlertCircle, Building2, ShieldAlert, ChevronRight, Hash } from 'lucide-react';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  t: any;
  isRTL: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, t, isRTL }) => {
  const [hallIdInput, setHallIdInput] = useState(() => localStorage.getItem('cuemaster_last_hall_id') || '');
  const [isHallVerified, setIsHallVerified] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Filter users based on the entered Hall ID
  // Super Admin (admin) is always available if they belong to 'MAIN' or matches the input
  const filteredUsers = useMemo(() => {
    if (!hallIdInput.trim()) return [];
    return users.filter(u => 
      u.hallId?.toLowerCase() === hallIdInput.trim().toLowerCase() || 
      (u.role === Role.ADMIN && hallIdInput.toUpperCase() === 'MAIN')
    );
  }, [users, hallIdInput]);

  useEffect(() => {
    // If we have a saved hall ID and it has valid users, auto-verify it
    if (hallIdInput && filteredUsers.length > 0) {
      setIsHallVerified(true);
    }
  }, []);

  const handleVerifyHall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallIdInput.trim()) {
      setError(isRTL ? 'تکایە ناسنامەی هۆڵ بنووسە' : 'Please enter Hall ID');
      return;
    }

    if (filteredUsers.length > 0) {
      setIsHallVerified(true);
      setError('');
      localStorage.setItem('cuemaster_last_hall_id', hallIdInput.trim());
    } else {
      setError(isRTL ? 'ئەم هۆڵە بوونی نییە یان هیچ ئەکاونتێکی تێدا نییە' : 'Hall not found or has no accounts');
    }
  };

  const handleLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (password === selectedUser.password) {
      // Super Admin bypasses status checks
      if (selectedUser.role === Role.ADMIN) {
        onLogin({ ...selectedUser, hallId: selectedUser.hallId || 'MAIN' });
        return;
      }

      // 1. Manual Lock Check
      if (selectedUser.status === 'LOCKED') {
        setError(t.lockedMsg);
        return;
      }

      // 2. Subscription Check via Hall Owner
      const hallOwner = users.find(u => 
        u.hallId === selectedUser.hallId && 
        (u.role === Role.MANAGER || u.role === Role.ADMIN)
      );
      
      if (hallOwner) {
        if (hallOwner.status === 'LOCKED') {
          setError(t.lockedMsg);
          return;
        }
        if (hallOwner.subscriptionExpiresAt && Date.now() > hallOwner.subscriptionExpiresAt) {
          setError(t.hallExpiredLock || t.expiredMsg);
          return;
        }
      }

      onLogin({ ...selectedUser, hallId: selectedUser.hallId });
    } else {
      setError(isRTL ? 'وشەی تێپەڕ هەڵەیە.' : 'Incorrect password.');
    }
  };

  const resetHall = () => {
    setIsHallVerified(false);
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  const resetUser = () => {
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  return (
    <div className={`min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900 to-slate-900 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 text-emerald-500 mb-4">
           <TrendingUp size={48} />
           <h1 className="text-4xl font-black tracking-tight">{t.appName}</h1>
        </div>
        <p className="text-slate-400 font-medium text-lg">{t.tagline}</p>
      </div>

      <div className="bg-slate-800 border border-slate-700/50 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 backdrop-blur-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-2">
            <ShieldAlert size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Phase 1: Enter Hall ID */}
        {!isHallVerified ? (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 size={32} />
               </div>
               <h2 className="text-xl font-black text-white">{isRTL ? 'ناسنامەی هۆڵ بنووسە' : 'Enter Hall ID'}</h2>
               <p className="text-xs text-slate-500 mt-2 font-medium">{isRTL ? 'بۆ بینینی ئەکاونتەکانی هۆڵەکەت، سەرەتا ناسنامەکەی لێرە بنووسە' : 'To see your hall accounts, please enter the Hall ID first.'}</p>
            </div>

            <form onSubmit={handleVerifyHall} className="space-y-6">
              <div className="relative">
                <input 
                  type="text"
                  autoFocus
                  value={hallIdInput}
                  onChange={(e) => {
                    setHallIdInput(e.target.value);
                    if (error) setError('');
                  }}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white focus:outline-none focus:border-indigo-500 text-lg transition-all font-black text-center tracking-widest ${isRTL ? 'pr-4 pl-4' : 'pl-4 pr-4'}`}
                  placeholder="e.g. golden-cue"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {isRTL ? 'بەردەوامبە' : 'Continue'} <ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} />
              </button>
            </form>
          </div>
        ) : (
          /* Phase 2: User Selection or Password */
          <>
            {!selectedUser ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <h2 className="text-lg font-black text-white">{t.selectProfile}</h2>
                   <button onClick={resetHall} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1">
                      <ArrowLeft size={12} className={isRTL ? 'rotate-180' : ''} /> {isRTL ? 'گۆڕینی هۆڵ' : 'Change Hall'}
                   </button>
                </div>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => { setSelectedUser(user); setError(''); }}
                      className={`w-full flex items-center justify-between p-5 bg-slate-900/50 border border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-500/5 group transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${user.role === Role.ADMIN ? 'bg-indigo-600 shadow-indigo-500/20' : user.role === Role.MANAGER ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-700'}`}>
                          {user.role === Role.ADMIN ? <Shield size={24} /> : user.role === Role.MANAGER ? <Building2 size={24} /> : <UserCircle size={24} />}
                        </div>
                        <div>
                          <div className="font-black text-lg text-slate-100">{user.username}</div>
                          <div className={`text-[10px] font-black uppercase tracking-tighter ${user.role === Role.ADMIN ? 'text-indigo-400' : 'text-slate-500'}`}>
                            {user.role === Role.ADMIN ? t.admin : user.role === Role.MANAGER ? t.manager : t.staff}
                          </div>
                        </div>
                      </div>
                      <LogIn className={`text-slate-600 group-hover:text-emerald-500 transition-all ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} size={24} />
                    </button>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col items-center gap-2">
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Authorized for</span>
                   <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 rounded-full border border-slate-700">
                      <Hash size={12} className="text-indigo-400" />
                      <span className="text-xs font-black text-white uppercase tracking-widest">{hallIdInput}</span>
                   </div>
                </div>
              </div>
            ) : (
              /* Phase 3: Password Entry */
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button 
                  onClick={resetUser}
                  className={`flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <ArrowLeft size={16} className={`transition-transform ${isRTL ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} /> {t.back}
                </button>

                <div className="flex flex-col items-center mb-8">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-2xl ${selectedUser.role === Role.ADMIN ? 'bg-indigo-600 shadow-indigo-500/20' : selectedUser.role === Role.MANAGER ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-700 shadow-xl'}`}>
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-black text-white">{selectedUser.username}</h2>
                  <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mt-1">{selectedUser.role === Role.ADMIN ? t.admin : selectedUser.role === Role.MANAGER ? t.manager : t.staff}</p>
                </div>

                <form onSubmit={handleLoginAttempt} className="space-y-6">
                  <div className={isRTL ? 'text-right' : ''}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">{t.enterPassword}</label>
                    <div className="relative">
                      <input 
                        type="password"
                        autoFocus
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError('');
                        }}
                        className={`w-full bg-slate-900 border ${error ? 'border-rose-500' : 'border-slate-700'} rounded-2xl py-4 text-white focus:outline-none focus:border-emerald-500 text-lg transition-all ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                      />
                      <Lock className={`absolute top-1/2 -translate-y-1/2 ${error ? 'text-rose-500' : 'text-slate-500'} ${isRTL ? 'right-4' : 'left-4'}`} size={20} />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className={`w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {t.unlockAccess} <LogIn size={20} />
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

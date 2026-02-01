
import React, { useState } from 'react';
import { User, Role } from '../types';
import { Shield, UserCircle, LogIn, TrendingUp, Lock, ArrowLeft, AlertCircle, Building2, ShieldAlert } from 'lucide-react';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  t: any;
  isRTL: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ users, onLogin, t, isRTL }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [hallId, setHallId] = useState('');
  const [error, setError] = useState('');

  const handleLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (password === selectedUser.password) {
      // CRITICAL: Super Admin (Role.ADMIN) should NEVER be locked out.
      // We bypass all status and hall validation checks for admins.
      if (selectedUser.role === Role.ADMIN) {
        onLogin({ ...selectedUser, hallId: selectedUser.hallId || 'MAIN' });
        return;
      }

      const finalHallId = selectedUser.hallId || hallId.trim();
      
      // Check hall existence
      if (!finalHallId) {
        setError(isRTL ? 'تکایە ناسنامەی هۆڵ (Hall ID) بنووسە.' : 'Please enter a Hall ID.');
        return;
      }

      // 1. Manual Lock Check for the specific user
      if (selectedUser.status === 'LOCKED') {
        setError(t.lockedMsg);
        return;
      }

      // 2. Subscription & Hall Validity Check
      // Find the "Owner" of this hall (Either a Manager or an Admin assigned to this hall)
      const hallOwner = users.find(u => 
        u.hallId === finalHallId && 
        (u.role === Role.MANAGER || u.role === Role.ADMIN)
      );
      
      if (hallOwner) {
        // If the owner is locked, no one can log in to that hall (Except Admins handled above)
        if (hallOwner.status === 'LOCKED') {
          setError(t.lockedMsg);
          return;
        }
        // Check subscription (only if the owner has an expiration date set)
        if (hallOwner.subscriptionExpiresAt && Date.now() > hallOwner.subscriptionExpiresAt) {
          setError(t.hallExpiredLock || t.expiredMsg);
          return;
        }
      } else {
        // If no owner (Admin or Manager) is found for this hall ID
        setError(isRTL ? 'هیچ هۆڵێک بەم ناوە نییە.' : 'No hall found with this ID.');
        return;
      }

      onLogin({ ...selectedUser, hallId: finalHallId });
    } else {
      setError(isRTL ? 'وشەی تێپەڕ هەڵەیە.' : 'Incorrect password.');
    }
  };

  const resetSelection = () => {
    setSelectedUser(null);
    setPassword('');
    setHallId('');
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

      <div className="bg-slate-800 border border-slate-700/50 w-full max-w-md rounded-3xl shadow-2xl p-10 backdrop-blur-xl relative overflow-hidden">
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-2">
            <ShieldAlert size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {!selectedUser ? (
          <>
            <h2 className="text-xl font-bold text-center mb-8">{t.selectProfile}</h2>
            <div className="space-y-4">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => { setSelectedUser(user); setError(''); }}
                  className={`w-full flex items-center justify-between p-5 bg-slate-900/50 border border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-500/5 group transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${user.role === Role.ADMIN ? 'bg-indigo-600 shadow-indigo-500/20 shadow-lg' : user.role === Role.MANAGER ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-700'}`}>
                      {user.role === Role.ADMIN ? <Shield size={24} /> : user.role === Role.MANAGER ? <Building2 size={24} /> : <UserCircle size={24} />}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-100">{user.username}</div>
                      <div className={`text-[10px] font-black uppercase tracking-tighter ${user.role === Role.ADMIN ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {user.role === Role.ADMIN ? t.admin : user.role === Role.MANAGER ? t.manager : t.staff}
                      </div>
                    </div>
                  </div>
                  <LogIn className={`text-slate-600 group-hover:text-emerald-500 transition-all ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} size={24} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button 
              onClick={resetSelection}
              className={`flex items-center gap-2 text-slate-400 hover:text-white mb-8 text-sm transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <ArrowLeft size={16} className={`transition-transform ${isRTL ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} /> {t.back}
            </button>

            <div className="flex flex-col items-center mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4 ${selectedUser.role === Role.ADMIN ? 'bg-indigo-600 shadow-indigo-500/20 shadow-xl' : selectedUser.role === Role.MANAGER ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-700 shadow-xl'}`}>
                {selectedUser.username[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-white">{selectedUser.username}</h2>
              <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mt-1">{selectedUser.role === Role.ADMIN ? t.admin : selectedUser.role === Role.MANAGER ? t.manager : t.staff}</p>
            </div>

            <form onSubmit={handleLoginAttempt} className="space-y-6">
              {selectedUser.role !== Role.ADMIN && !selectedUser.hallId && (
                <div className={isRTL ? 'text-right' : ''}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Hall ID</label>
                  <div className="relative">
                    <input 
                      type="text"
                      required
                      value={hallId}
                      onChange={(e) => setHallId(e.target.value)}
                      className={`w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white focus:outline-none focus:border-indigo-500 text-lg transition-all ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                      placeholder="e.g. main-hall"
                    />
                    <Building2 className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={20} />
                  </div>
                </div>
              )}

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
      </div>
    </div>
  );
};

export default LoginPage;

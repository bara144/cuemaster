
import React, { useState, useMemo } from 'react';
import { User, Role } from '../types';
import { UserPlus, Shield, Trash2, CheckCircle2, Lock, Trophy, RotateCw, ShieldOff, ToggleLeft, ToggleRight, XCircle, Key, X, Save, Building2, Loader2, Store } from 'lucide-react';
import { syncToCloud } from '../services/firebaseService';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  t: any;
  currentUser: User | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, t, currentUser }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.STAFF);
  const [allowTournament, setAllowTournament] = useState(false);
  const [allowWheel, setAllowWheel] = useState(false);
  const [allowMarketplace, setAllowMarketplace] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // States for Password Change
  const [editingPasswordUser, setEditingPasswordUser] = useState<User | null>(null);
  const [tempNewPassword, setTempNewPassword] = useState('');

  const isSuperAdmin = currentUser?.role === Role.ADMIN;
  const isManager = currentUser?.role === Role.MANAGER;

  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) {
      return users.filter(u => u.hallId === currentUser?.hallId);
    }
    if (isManager) {
      return users.filter(u => u.role === Role.STAFF && u.hallId === currentUser?.hallId);
    }
    return [];
  }, [users, isSuperAdmin, isManager, currentUser?.hallId]);

  const addUser = async () => {
    if (!newUsername || !newPassword) return;
    
    // Validate Hall ID
    const targetHallId = currentUser?.hallId;
    if (!targetHallId) {
      alert(t.appName === "بیگ بۆس" ? "هەڵە: ناسنامەی هۆڵ (Hall ID) دەستنیشان نەکراوە!" : "Error: Hall ID is missing!");
      return;
    }

    setIsSaving(true);
    
    const permissions = ['sessions', 'history', 'debts']; 
    if (newRole === Role.MANAGER || newRole === Role.ADMIN) {
      permissions.push('all');
    } else {
      if (allowTournament) permissions.push('tournament');
      if (allowWheel) permissions.push('wheel');
      if (allowMarketplace) permissions.push('marketplace');
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      permissions: permissions,
      hallId: targetHallId,
      status: 'ACTIVE'
    };

    const updatedUsersList = [...users, newUser];

    try {
      // 1. Update Local State
      setUsers(updatedUsersList);
      
      // 2. Direct Sync to Firebase
      await syncToCloud('users', updatedUsersList);
      
      // Reset Form
      setNewUsername('');
      setNewPassword('');
      setAllowTournament(false);
      setAllowWheel(false);
      setAllowMarketplace(false);
      setNewRole(Role.STAFF);
    } catch (error) {
      console.error("Cloud Sync Failed:", error);
      alert(t.appName === "بیگ بۆس" 
        ? "کێشەیەک لە پەیوەندی ئینتەرنێت هەیە، دڵنیا بەرەوە داتاکان سەیڤ بوون!" 
        : "Connection error: Please ensure data is saved to the cloud!");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === currentUser?.id) return;
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;

    if (isManager && (userToDelete.role !== Role.STAFF || userToDelete.hallId !== currentUser?.hallId)) {
      return;
    }

    if ((userToDelete.role === Role.ADMIN || userToDelete.role === Role.MANAGER) && 
        users.filter(u => u.role === Role.ADMIN || u.role === Role.MANAGER).length === 1) {
      return;
    }

    const updatedList = users.filter(u => u.id !== id);
    setUsers(updatedList);
    try {
      await syncToCloud('users', updatedList);
    } catch (e) {
      console.error("Delete sync failed", e);
    }
  };

  const updatePassword = async () => {
    if (!editingPasswordUser || !tempNewPassword.trim()) return;
    
    const updatedList = users.map(user => 
      user.id === editingPasswordUser.id 
        ? { ...user, password: tempNewPassword.trim() } 
        : user
    );
    
    setUsers(updatedList);
    try {
      await syncToCloud('users', updatedList);
      setEditingPasswordUser(null);
      setTempNewPassword('');
    } catch (e) {
      alert("Error updating password in cloud.");
    }
  };

  const togglePermission = async (userId: string, permission: string) => {
    const updatedList = users.map(user => {
      if (user.id === userId && user.role === Role.STAFF) {
        const hasPermission = user.permissions.includes(permission);
        const newPermissions = hasPermission
          ? user.permissions.filter(p => p !== permission)
          : [...user.permissions, permission];
        return { ...user, permissions: newPermissions };
      }
      return user;
    });

    setUsers(updatedList);
    try {
      await syncToCloud('users', updatedList);
    } catch (e) {
      console.error("Permission sync failed", e);
    }
  };

  const isRTL = t.appName === "بیگ بۆس";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Create User Section */}
      <div className={`bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden ${isRTL ? 'text-right' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 opacity-30"></div>
        
        <h3 className={`text-2xl font-black mb-10 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
            <UserPlus size={28} />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
             {isSuperAdmin ? (isRTL ? 'دروستکردنی ستافی ئەدمین' : 'Create Admin Staff') : t.createAccount}
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">
               {isRTL ? `زیادکردنی ستاف بۆ هۆڵی: ${currentUser?.hallId || '?'}` : `Adding Staff to Hall: ${currentUser?.hallId || '?'}`}
             </p>
          </div>
        </h3>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{t.username}</label>
              <input 
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-[1.25rem] px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-bold placeholder:text-slate-700 ${isRTL ? 'text-right' : ''}`}
                placeholder="Ex: staff_name"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{t.password}</label>
              <div className="relative">
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-[1.25rem] px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-bold ${isRTL ? 'pr-14 text-right' : 'pl-14'}`}
                  placeholder="••••"
                />
                <Lock className={`absolute top-1/2 -translate-y-1/2 text-slate-600 ${isRTL ? 'right-5' : 'left-5'}`} size={20} />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{t.accessRole}</label>
              <div className="relative">
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  disabled={!isSuperAdmin}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-[1.25rem] px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-bold appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'text-right' : ''}`}
                >
                  <option value={Role.STAFF}>{t.staff}</option>
                  {isSuperAdmin && (
                    <>
                      <option value={Role.ADMIN}>{t.admin}</option>
                      <option value={Role.MANAGER}>{t.manager}</option>
                    </>
                  )}
                </select>
                <Shield className={`absolute top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none ${isRTL ? 'left-5' : 'right-5'}`} size={18} />
              </div>
            </div>
          </div>

          {newRole === Role.STAFF && (
            <div className={`flex flex-col sm:flex-row flex-wrap gap-8 p-8 bg-slate-900/50 rounded-3xl border border-slate-700/50 shadow-inner ${isRTL ? 'flex-row-reverse' : ''}`}>
               <label className={`flex items-center gap-5 cursor-pointer group select-none ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-14 h-7 rounded-full transition-all relative flex items-center ${allowTournament ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md flex items-center justify-center ${allowTournament ? (isRTL ? '-translate-x-8' : 'translate-x-8') : 'translate-x-1'}`}>
                       {!allowTournament && <Lock size={10} className="text-slate-500" />}
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={allowTournament} onChange={(e) => setAllowTournament(e.target.checked)} />
                  <span className="text-sm font-black text-slate-300 flex items-center gap-2">
                    <Trophy size={20} className={allowTournament ? 'text-amber-500' : 'text-slate-600'} /> {t.allowTournament}
                  </span>
               </label>
               
               <label className={`flex items-center gap-5 cursor-pointer group select-none ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-14 h-7 rounded-full transition-all relative flex items-center ${allowWheel ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md flex items-center justify-center ${allowWheel ? (isRTL ? '-translate-x-8' : 'translate-x-8') : 'translate-x-1'}`}>
                       {!allowWheel && <Lock size={10} className="text-slate-500" />}
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={allowWheel} onChange={(e) => setAllowWheel(e.target.checked)} />
                  <span className="text-sm font-black text-slate-300 flex items-center gap-2">
                    <RotateCw size={20} className={allowWheel ? 'text-indigo-400' : 'text-slate-600'} /> {t.allowWheel}
                  </span>
               </label>

               <label className={`flex items-center gap-5 cursor-pointer group select-none ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-14 h-7 rounded-full transition-all relative flex items-center ${allowMarketplace ? 'bg-orange-600 shadow-lg shadow-orange-500/20' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md flex items-center justify-center ${allowMarketplace ? (isRTL ? '-translate-x-8' : 'translate-x-8') : 'translate-x-1'}`}>
                       {!allowMarketplace && <Lock size={10} className="text-slate-500" />}
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={allowMarketplace} onChange={(e) => setAllowMarketplace(e.target.checked)} />
                  <span className="text-sm font-black text-slate-300 flex items-center gap-2">
                    <Store size={20} className={allowMarketplace ? 'text-orange-400' : 'text-slate-600'} /> {isRTL ? 'ڕێگەدان بە بازاڕ' : 'Allow Marketplace'}
                  </span>
               </label>
            </div>
          )}

          <button 
            onClick={addUser}
            disabled={!newUsername || !newPassword || isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed py-5 rounded-[1.5rem] font-black text-lg transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <UserPlus size={24} />}
            {isSaving ? (isRTL ? "لە پڕۆسەی سەیڤکردندایە..." : "Saving...") : t.generateUser}
          </button>
        </div>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleUsers.map(user => {
          const isUserPrivileged = user.role === Role.ADMIN || user.role === Role.MANAGER;
          const isOwner = user.id === currentUser?.id;
          const hasTournament = user.permissions.includes('tournament') || user.permissions.includes('all');
          const hasWheel = user.permissions.includes('wheel') || user.permissions.includes('all');
          const hasMarketplace = user.permissions.includes('marketplace') || user.permissions.includes('all');

          return (
            <div key={user.id} className={`bg-slate-800 border rounded-[3rem] p-8 group transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] shadow-xl ${isUserPrivileged ? 'border-indigo-500/30' : 'border-slate-700/50 hover:border-slate-500'}`}>
              <div className={`flex justify-between items-start mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-white text-3xl shadow-2xl transition-transform group-hover:rotate-3 ${isUserPrivileged ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xl text-white tracking-tight leading-tight truncate">{user.username}</h4>
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg tracking-wider mt-1 inline-block ${isUserPrivileged ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500'}`}>
                      {user.role === Role.ADMIN ? t.admin : user.role === Role.MANAGER ? t.manager : t.staff}
                    </span>
                    {isSuperAdmin && user.hallId && (
                      <p className="text-[8px] text-indigo-500 font-bold uppercase mt-1">Hall: {user.hallId}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => setEditingPasswordUser(user)}
                    className="text-slate-600 hover:text-emerald-500 transition-all p-2 hover:bg-emerald-500/10 rounded-xl"
                    title={t.changePassword}
                  >
                    <Key size={18} />
                  </button>
                  {!isOwner && (
                    <button 
                      onClick={() => deleteUser(user.id)}
                      className="text-slate-600 hover:text-rose-500 transition-all p-2 hover:bg-rose-500/10 rounded-xl"
                      title={t.remove}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.25em]">
                    {t.permissions}
                  </p>
                  <div className="h-px flex-1 mx-4 bg-slate-700/50"></div>
                </div>
                
                {isUserPrivileged ? (
                  <div className="bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-[1.5rem] p-5 flex items-center gap-4 text-indigo-400 shadow-inner">
                    <Shield size={24} className="shrink-0" />
                    <div className={isRTL ? 'text-right' : ''}>
                       <span className="text-xs font-black uppercase tracking-widest block">Elevated Access</span>
                       <p className="text-[9px] font-medium opacity-60">Full Control of Hall Management</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between p-3.5 bg-slate-900/40 rounded-[1.25rem] border border-slate-700/30 opacity-70 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">{t.activeTables}</span>
                      </div>
                      <Lock size={12} className="text-slate-700" />
                    </div>

                    <button 
                      onClick={() => togglePermission(user.id, 'tournament')}
                      className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] border transition-all duration-300 active:scale-[0.97] group/btn ${
                        hasTournament 
                          ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400' 
                          : 'bg-slate-900/60 border-slate-800 text-slate-600'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${hasTournament ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-700'}`}>
                          <Trophy size={18} />
                        </div>
                        <span className="text-xs font-black tracking-tight">{t.tournament}</span>
                      </div>
                      <div className="flex items-center justify-center w-12 h-6">
                        {hasTournament ? (
                          <ToggleRight size={26} className="text-emerald-500 transition-all group-hover/btn:scale-110" />
                        ) : (
                          <div className="bg-slate-800/80 p-1.5 rounded-full border border-slate-700/50 shadow-inner">
                             <Lock size={12} className="text-slate-500" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button 
                      onClick={() => togglePermission(user.id, 'wheel')}
                      className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] border transition-all duration-300 active:scale-[0.97] group/btn ${
                        hasWheel 
                          ? 'bg-indigo-500/5 border-indigo-500/30 text-indigo-400' 
                          : 'bg-slate-900/60 border-slate-800 text-slate-600'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${hasWheel ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-700'}`}>
                          <RotateCw size={18} />
                        </div>
                        <span className="text-xs font-black tracking-tight">{t.wheel}</span>
                      </div>
                      <div className="flex items-center justify-center w-12 h-6">
                        {hasWheel ? (
                          <ToggleRight size={26} className="text-indigo-500 transition-all group-hover/btn:scale-110" />
                        ) : (
                          <div className="bg-slate-800/80 p-1.5 rounded-full border border-slate-700/50 shadow-inner">
                             <Lock size={12} className="text-slate-500" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button 
                      onClick={() => togglePermission(user.id, 'marketplace')}
                      className={`w-full flex items-center justify-between p-4 rounded-[1.25rem] border transition-all duration-300 active:scale-[0.97] group/btn ${
                        hasMarketplace 
                          ? 'bg-orange-500/5 border-orange-500/30 text-orange-400' 
                          : 'bg-slate-900/60 border-slate-800 text-slate-600'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${hasMarketplace ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-700'}`}>
                          <Store size={18} />
                        </div>
                        <span className="text-xs font-black tracking-tight">{isRTL ? 'بازاڕی کاڵاکان' : 'Marketplace'}</span>
                      </div>
                      <div className="flex items-center justify-center w-12 h-6">
                        {hasMarketplace ? (
                          <ToggleRight size={26} className="text-emerald-500 transition-all group-hover/btn:scale-110" />
                        ) : (
                          <div className="bg-slate-800/80 p-1.5 rounded-full border border-slate-700/50 shadow-inner">
                             <Lock size={12} className="text-slate-500" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Password Change Modal */}
      {editingPasswordUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-slate-800 w-full max-w-md rounded-[2.5rem] border border-emerald-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className={`p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Key size={20} className="text-emerald-400" />
                  <h3 className="font-black text-white">{t.changePassword}</h3>
                </div>
                <button onClick={() => setEditingPasswordUser(null)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="text-center">
                   <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white text-2xl font-black mx-auto mb-3">
                      {editingPasswordUser.username[0].toUpperCase()}
                   </div>
                   <h4 className="text-lg font-black text-white">{editingPasswordUser.username}</h4>
                </div>

                <div className="space-y-3">
                  <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 ${isRTL ? 'text-right' : ''}`}>{t.newPassword}</label>
                  <div className="relative">
                    <input 
                      type="password"
                      autoFocus
                      value={tempNewPassword}
                      onChange={(e) => setTempNewPassword(e.target.value)}
                      className={`w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white focus:outline-none focus:border-emerald-500 text-lg transition-all ${isRTL ? 'pr-12 text-right' : 'pl-12'}`}
                      placeholder="••••"
                    />
                    <Lock className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={20} />
                  </div>
                </div>

                <button 
                  onClick={updatePassword}
                  disabled={!tempNewPassword.trim()}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Save size={20} />
                  {t.updatePassword}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

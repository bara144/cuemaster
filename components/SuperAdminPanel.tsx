
import React, { useState, useMemo } from 'react';
import { User, Role, UserStatus, UserUsageLimits, Notification } from '../types';
import { Building2, UserPlus, Shield, Trash2, Key, Search, LayoutGrid, CheckCircle2, Lock, Plus, Building, Clock, Calendar, ShieldAlert, ShieldCheck, Timer, Minus, MessageSquare, Send, X, Bell, Zap, Gauge, CalendarDays, CalendarRange, Infinity, BarChart3, Loader2, Phone, MapPin, Edit3, Save } from 'lucide-react';
import { syncToCloud } from '../services/firebaseService';

interface SuperAdminPanelProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  t: any;
  isRTL: boolean;
  isDark: boolean;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  onViewHall?: (hallId: string) => void;
}

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ users, setUsers, t, isRTL, isDark, notifications, setNotifications, onViewHall }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newHallId, setNewHallId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [duration, setDuration] = useState<number>(1); // Months
  const [maxUses, setMaxUses] = useState<number>(4);
  const [sessionHours, setSessionHours] = useState<number>(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Messaging state
  const [messagingUser, setMessagingUser] = useState<User | null>(null);
  const [tempMessage, setTempMessage] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFields, setEditFields] = useState({
    username: '',
    password: '',
    phoneNumber: '',
    address: ''
  });

  const managers = useMemo(() => {
    return users.filter(u => u.role === Role.MANAGER || (u.role === Role.ADMIN && u.hallId));
  }, [users]);

  const filteredManagers = useMemo(() => {
    return managers.filter(m => 
      m.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.hallId && m.hallId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [managers, searchTerm]);

  const createManager = async () => {
    const trimmedHallId = newHallId.trim();
    if (!newUsername || !newPassword || !trimmedHallId) {
      alert(isRTL ? "تکایە هەموو خانەکان پڕ بکەرەوە!" : "Please fill all fields!");
      return;
    }

    setIsSaving(true);

    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + duration);
    
    const newManager: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: Role.MANAGER,
      permissions: ['all'], 
      hallId: trimmedHallId,
      status: 'ACTIVE',
      subscriptionExpiresAt: expirationDate.getTime(),
      phoneNumber: newPhone.trim(),
      address: newAddress.trim(),
      usageLimits: {
        maxUsesPerMonth: maxUses,
        sessionDurationHours: sessionHours,
        history: []
      }
    };

    const updatedUsersList = [...users, newManager];

    try {
      setUsers(updatedUsersList);
      await syncToCloud('users', updatedUsersList);
      setNewUsername('');
      setNewPassword('');
      setNewHallId('');
      setNewPhone('');
      setNewAddress('');
      alert(isRTL ? "بەڕێوەبەری نوێ بە سەرکەوتوویی دروستکرا و سەیڤ کرا!" : "New manager successfully created and synced!");
    } catch (error) {
      console.error("Cloud Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFields({
      username: user.username,
      password: user.password,
      phoneNumber: user.phoneNumber || '',
      address: user.address || ''
    });
  };

  const handleUpdateManager = async () => {
    if (!editingUser) return;
    setIsSaving(true);

    const updatedList = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          username: editFields.username.trim(),
          password: editFields.password.trim(),
          phoneNumber: editFields.phoneNumber.trim(),
          address: editFields.address.trim()
        };
      }
      return u;
    });

    try {
      setUsers(updatedList);
      await syncToCloud('users', updatedList);
      setEditingUser(null);
      alert(isRTL ? "زانیارییەکان بە سەرکەوتوویی نوێکرانەوە" : "Profile updated successfully");
    } catch (error) {
      alert("Error updating: " + error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuota = async (userId: string, key: keyof UserUsageLimits, val: number) => {
    const updatedList = users.map(u => {
      if (u.id === userId) {
        const currentLimits = u.usageLimits || { maxUsesPerMonth: 4, sessionDurationHours: 5, history: [] };
        return { 
          ...u, 
          usageLimits: { ...currentLimits, [key]: Math.max(1, val) } 
        };
      }
      return u;
    });
    setUsers(updatedList);
    try {
      await syncToCloud('users', updatedList);
    } catch (e) { console.error(e); }
  };

  const toggleLock = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === Role.ADMIN) return;

    const updatedList: User[] = users.map(u => 
      u.id === userId 
        ? { ...u, status: (u.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED') as UserStatus } 
        : u
    );
    setUsers(updatedList);
    try {
      await syncToCloud('users', updatedList);
    } catch (e) { console.error(e); }
  };

  const adjustSubscription = async (userId: string, months: number, days: number = 0) => {
    const updatedList = users.map(u => {
      if (u.id === userId) {
        const currentExp = u.subscriptionExpiresAt || Date.now();
        const newExpDate = new Date(currentExp);
        if (months !== 0) newExpDate.setMonth(newExpDate.getMonth() + months);
        if (days !== 0) newExpDate.setDate(newExpDate.getDate() + days);
        const newTimestamp = newExpDate.getTime();
        return { 
          ...u, 
          subscriptionExpiresAt: newTimestamp,
          status: newTimestamp > Date.now() ? 'ACTIVE' : u.status 
        };
      }
      return u;
    });
    setUsers(updatedList);
    try {
      await syncToCloud('users', updatedList);
    } catch (e) { console.error(e); }
  };

  const sendSystemNotification = async () => {
    if (!messagingUser || !tempMessage.trim()) return;
    const newNote: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      text: tempMessage.trim(),
      hallId: messagingUser.hallId!,
      timestamp: Date.now()
    };
    const updatedNotes = [newNote, ...notifications];
    setNotifications(updatedNotes);
    try {
      await syncToCloud('notifications', updatedNotes);
      setTempMessage('');
      setMessagingUser(null);
    } catch (e) { alert("Message sync failed."); }
  };

  const removeNotification = async (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    try {
      await syncToCloud('notifications', updated);
    } catch (e) { console.error(e); }
  };

  const removeManager = async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.role === Role.ADMIN) return;

    if (confirm(isRTL ? 'ئایا دڵنیایت لە سڕینەوەی ئەم بەڕێوەبەرە؟' : 'Are you sure you want to remove this manager?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      try {
        await syncToCloud('users', updated);
      } catch (e) { alert("Delete sync failed."); }
    }
  };

  const getDaysRemaining = (timestamp?: number) => {
    if (!timestamp) return 0;
    const diff = timestamp - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Create Hall Section */}
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isRTL ? 'text-right' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-30"></div>
        <div className={`flex items-center gap-4 mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Building2 size={32} /></div>
           <div className={isRTL ? 'text-right' : ''}>
              <h3 className="text-2xl font-black text-white">{t.createManager}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Manager Credentialing & Quotas</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.hallId}</label>
              <input type="text" value={newHallId} onChange={(e) => setNewHallId(e.target.value)} placeholder="e.g. golden-cue" className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`} />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.username}</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`} />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.password}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`} />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.phoneNumber}</label>
              <div className="relative">
                <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="07XX XXX XXXX" className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`} />
                <Phone className={`absolute top-1/2 -translate-y-1/2 text-slate-600 ${isRTL ? 'left-4' : 'right-4'}`} size={18} />
              </div>
           </div>
           <div className="lg:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.address}</label>
              <div className="relative">
                <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="..." className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`} />
                <MapPin className={`absolute top-1/2 -translate-y-1/2 text-slate-600 ${isRTL ? 'left-4' : 'right-4'}`} size={18} />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
           <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                 <Zap size={12} className="text-amber-500" /> {t.maxUses}
              </label>
              <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-700">
                 <button onClick={() => setMaxUses(Math.max(1, maxUses - 1))} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white hover:bg-slate-700 transition-all">-</button>
                 <span className="flex-1 text-center font-black text-xl text-white">{maxUses}</span>
                 <button onClick={() => setMaxUses(maxUses + 1)} className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-500 transition-all">+</button>
              </div>
           </div>
           <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                 <Timer size={12} className="text-emerald-500" /> {t.durationHours}
              </label>
              <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-700">
                 <button onClick={() => setSessionHours(Math.max(1, sessionHours - 1))} className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white hover:bg-slate-700 transition-all">-</button>
                 <span className="flex-1 text-center font-black text-xl text-white">{sessionHours}</span>
                 <button onClick={() => setSessionHours(sessionHours + 1)} className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-500 transition-all">+</button>
              </div>
        </div>
        </div>

        <button 
          onClick={createManager} 
          disabled={!newUsername || !newPassword || !newHallId || isSaving} 
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-[1.5rem] font-black text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
        >
          {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
          {isSaving ? (isRTL ? "لە پڕۆسەی سەیڤکردندایە..." : "Saving...") : t.createAccount}
        </button>
      </div>

      {/* Hall List Section */}
      <div className="space-y-6">
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3"><Building size={18} /> {t.registeredHalls}</h4>
           <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
              <input type="text" placeholder={t.searchPlayers} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`bg-slate-800 border border-slate-700 rounded-2xl py-3 px-12 text-white w-full md:w-64 focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`} />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredManagers.map(manager => {
             const daysLeft = getDaysRemaining(manager.subscriptionExpiresAt);
             const isExpired = daysLeft <= 0;
             const isLocked = manager.status === 'LOCKED';
             const mUses = manager.usageLimits?.maxUsesPerMonth || 4;
             const mHours = manager.usageLimits?.sessionDurationHours || 5;
             const isAd = manager.role === Role.ADMIN;

             return (
               <div key={manager.id} className={`p-6 rounded-[2.5rem] border transition-all hover:scale-[1.01] shadow-xl relative overflow-hidden flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isLocked ? 'grayscale opacity-75' : ''}`}>
                <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg ${isLocked ? 'bg-slate-600' : isExpired ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                        {manager.username[0].toUpperCase()}
                      </div>
                      <div>
                        <h5 className="text-xl font-black text-white leading-tight">{manager.username}</h5>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">ID: {manager.hallId}</p>
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-2 justify-end max-w-[120px]">
                    <button onClick={() => onViewHall && manager.hallId && onViewHall(manager.hallId)} className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all" title={t.viewDashboard}>
                       <BarChart3 size={18} />
                     </button>
                    <button onClick={() => setMessagingUser(manager)} className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl hover:bg-indigo-500 hover:text-white transition-all">
                       <MessageSquare size={18} />
                     </button>
                    <button onClick={() => handleOpenEdit(manager)} className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all" title={isRTL ? 'دەستکاری' : 'Edit Manager'}>
                       <Edit3 size={18} />
                     </button>
                    {!isAd && (
                      <button onClick={() => toggleLock(manager.id)} className={`p-2.5 rounded-xl border transition-all ${isLocked ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white'}`}>
                        {isLocked ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                      </button>
                    )}
                    {!isAd && (
                      <button onClick={() => removeManager(manager.id)} className="p-2.5 bg-slate-700/50 text-slate-400 border border-slate-700 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                    )}
                   </div>
                </div>

                {/* Contact Info Display */}
                <div className={`mb-6 space-y-2 p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                   {manager.phoneNumber && (
                      <div className={`flex items-center gap-3 text-slate-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <Phone size={14} className="text-emerald-500" />
                         <span className="text-xs font-bold font-mono tracking-tight">{manager.phoneNumber}</span>
                      </div>
                   )}
                   {manager.address && (
                      <div className={`flex items-center gap-3 text-slate-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <MapPin size={14} className="text-rose-500" />
                         <span className="text-[10px] font-bold leading-tight">{manager.address}</span>
                      </div>
                   )}
                   {!manager.phoneNumber && !manager.address && (
                      <p className="text-[8px] text-slate-600 font-bold uppercase italic">{isRTL ? 'زانیاری پەیوەندی نییە' : 'No contact info'}</p>
                   )}
                </div>

                {/* Status & Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                   <div className={`p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50 flex flex-col justify-center items-center gap-1`}>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'بارودۆخ' : 'Status'}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-rose-500' : isExpired ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                        <span className={`text-[10px] font-black uppercase ${isLocked ? t.locked : isExpired ? 'Expired' : t.active}`}>{isLocked ? t.locked : isExpired ? 'Expired' : t.active}</span>
                      </div>
                   </div>
                   <div className={`p-3 rounded-2xl bg-slate-900/50 border border-slate-700/50 flex flex-col justify-center items-center gap-1`}>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t.daysRemaining}</span>
                      <span className={`text-sm font-black ${isExpired ? 'text-rose-500' : 'text-white'}`}>{daysLeft}</span>
                   </div>
                </div>

                {/* Quota Settings Block */}
                <div className={`p-5 rounded-3xl mb-6 bg-slate-900/40 border border-slate-700/50 relative overflow-hidden`}>
                   <div className={`flex items-center gap-2 mb-4 text-indigo-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Gauge size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t.usageSettings}</span>
                   </div>
                   <div className="space-y-3">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <div className="flex items-center gap-2">
                           <Zap size={12} className="text-amber-500" />
                           <span className="text-[9px] font-black text-slate-400 uppercase">{t.maxUses}</span>
                         </div>
                         <div className={`flex items-center gap-3 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button onClick={() => updateQuota(manager.id, 'maxUsesPerMonth', mUses - 1)} className="text-slate-500 hover:text-white">-</button>
                            <span className="text-[11px] font-black text-white w-4 text-center">{mUses}</span>
                            <button onClick={() => updateQuota(manager.id, 'maxUsesPerMonth', mUses + 1)} className="text-slate-500 hover:text-white">+</button>
                         </div>
                      </div>
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <div className="flex items-center gap-2">
                           <Timer size={12} className="text-emerald-500" />
                           <span className="text-[9px] font-black text-slate-400 uppercase">{t.durationHours}</span>
                         </div>
                         <div className={`flex items-center gap-3 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button onClick={() => updateQuota(manager.id, 'sessionDurationHours', mHours - 1)} className="text-slate-500 hover:text-white">-</button>
                            <span className="text-[11px] font-black text-white w-4 text-center">{mHours}</span>
                            <button onClick={() => updateQuota(manager.id, 'sessionDurationHours', mHours + 1)} className="text-slate-500 hover:text-white">+</button>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Granular Subscription Adjustments */}
                <div className="space-y-4">
                   <div className={`flex items-center gap-2 text-emerald-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CalendarRange size={14} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isRTL ? 'نوێکردنەوەی بەژداریکردن' : 'Subscription Control'}</span>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-2">
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <div className="flex-1 flex gap-1">
                            <button onClick={() => adjustSubscription(manager.id, -1)} className="flex-1 py-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[8px] font-black uppercase">-1M</button>
                            <button onClick={() => adjustSubscription(manager.id, 1)} className="flex-1 py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-[8px] font-black uppercase">+1M</button>
                         </div>
                         <div className="w-10 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500" title="Month">
                            <Calendar size={14} />
                         </div>
                      </div>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <div className="flex-1 flex gap-1">
                            <button onClick={() => adjustSubscription(manager.id, 0, -7)} className="flex-1 py-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[8px] font-black uppercase">-1W</button>
                            <button onClick={() => adjustSubscription(manager.id, 0, 7)} className="flex-1 py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-[8px] font-black uppercase">+1W</button>
                         </div>
                         <div className="w-10 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500" title="Week">
                            <CalendarDays size={14} />
                         </div>
                      </div>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                         <div className="flex-1 flex gap-1">
                            <button onClick={() => adjustSubscription(manager.id, 0, -1)} className="flex-1 py-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[8px] font-black uppercase">-1D</button>
                            <button onClick={() => adjustSubscription(manager.id, 0, 1)} className="flex-1 py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-[8px] font-black uppercase">+1D</button>
                         </div>
                         <div className="w-10 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500" title="Day">
                            <Infinity size={14} />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             );
           })}
        </div>
      </div>

      {/* Edit Manager Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className={`bg-slate-800 border border-indigo-500/30 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 ${isRTL ? 'text-right' : ''}`}>
              <div className={`flex justify-between items-center mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                      <Edit3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{isRTL ? 'دەستکاری زانیارییەکان' : 'Edit Profile'}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hall ID: {editingUser.hallId}</p>
                    </div>
                 </div>
                 <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.username}</label>
                   <input 
                      type="text" 
                      value={editFields.username} 
                      onChange={(e) => setEditFields({...editFields, username: e.target.value})}
                      className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.password}</label>
                   <div className="relative">
                    <input 
                        type="password" 
                        value={editFields.password} 
                        onChange={(e) => setEditFields({...editFields, password: e.target.value})}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`}
                    />
                    <Key className={`absolute top-1/2 -translate-y-1/2 text-slate-600 ${isRTL ? 'left-5' : 'right-5'}`} size={18} />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.phoneNumber}</label>
                   <div className="relative">
                    <input 
                        type="text" 
                        value={editFields.phoneNumber} 
                        onChange={(e) => setEditFields({...editFields, phoneNumber: e.target.value})}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`}
                    />
                    <Phone className={`absolute top-1/2 -translate-y-1/2 text-slate-600 ${isRTL ? 'left-5' : 'right-5'}`} size={18} />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{t.address}</label>
                   <div className="relative">
                    <input 
                        type="text" 
                        value={editFields.address} 
                        onChange={(e) => setEditFields({...editFields, address: e.target.value})}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold ${isRTL ? 'text-right' : ''}`}
                    />
                    <MapPin className={`absolute top-1/2 -translate-y-1/2 text-slate-600 ${isRTL ? 'left-5' : 'right-5'}`} size={18} />
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-xl transition-all">
                    {t.cancel}
                  </button>
                  <button 
                    onClick={handleUpdateManager} 
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {t.save}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Messaging Modal */}
      {messagingUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-indigo-500/30 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
              <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <h3 className="text-xl font-black text-white">{t.sendMessage}</h3>
                 <button onClick={() => setMessagingUser(null)} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
                 <div className="space-y-6 flex flex-col">
                    <div className={`p-4 bg-slate-900 rounded-2xl border border-slate-700 ${isRTL ? 'text-right' : ''}`}>
                       <p className="text-xs font-black text-indigo-400 uppercase mb-1">To Hall:</p>
                       <p className="text-lg font-bold text-white">{messagingUser.hallId} ({messagingUser.username})</p>
                    </div>
                    <textarea 
                       value={tempMessage} 
                       onChange={(e) => setTempMessage(e.target.value)} 
                       placeholder={t.writeMessage}
                       className={`w-full flex-1 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 font-medium resize-none ${isRTL ? 'text-right' : ''}`}
                    />
                    <button 
                       onClick={sendSystemNotification}
                       disabled={!tempMessage.trim()}
                       className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-black rounded-xl flex items-center justify-center gap-3 transition-all"
                    >
                       <Send size={20} /> {t.sendMessage}
                    </button>
                 </div>

                 <div className="flex flex-col space-y-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.hallMessages}</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                       {notifications.filter(n => n.hallId === messagingUser.hallId).length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">No messages sent to this hall.</div>
                       ) : notifications.filter(n => n.hallId === messagingUser.hallId).map(note => (
                          <div key={note.id} className="p-4 bg-slate-900/50 border border-slate-700 rounded-2xl group">
                             <div className="flex justify-between items-start gap-3">
                                <p className="text-xs text-slate-300 flex-1 leading-relaxed">{note.text}</p>
                                <button onClick={() => removeNotification(note.id)} className="text-slate-600 hover:text-rose-500 transition-colors shrink-0">
                                   <Trash2 size={14} />
                                </button>
                             </div>
                             <p className="text-[8px] text-slate-600 font-bold uppercase mt-2">{new Date(note.timestamp).toLocaleString()}</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Role, Session, Transaction, AppSettings, Theme, AttendanceRecord, UsageSession, Notification } from './types';
import { INITIAL_ADMIN, DEFAULT_SETTINGS } from './constants';
import { translations } from './translations';
import { LogIn, LayoutDashboard, Users, Play, History, Settings, LogOut, TrendingUp, BookOpen, Users2, Moon, Sun, Trophy, RotateCw, Menu, Lock, LayoutGrid, Activity, Save, Swords, Languages, Clock, CheckCircle2, AlertTriangle, X, Sparkles, Heart, Database, Cloud, CloudOff, Building2, ChevronDown, ChevronUp, ShieldAlert, Timer, UserCircle, Bell, MessageSquare, BarChart3, ShoppingBasket } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SessionManager from './components/SessionManager';
import UserManagement from './components/UserManagement';
import HistoryView from './components/HistoryView';
import AdminSettings from './components/AdminSettings';
import LoginPage from './components/LoginPage';
import DebtManager from './components/DebtManager';
import PlayerManagement from './components/PlayerManagement';
import TournamentManager from './components/TournamentManager';
import WheelOfFortune from './components/WheelOfFortune';
import TableManager from './components/TableManager';
import MatchHistory from './components/MatchHistory';
import AttendanceManager from './components/AttendanceManager';
import SuperAdminPanel from './components/SuperAdminPanel';
import NotificationsView from './components/NotificationsView';
import HallStatsViewer from './components/HallStatsViewer';
import MarketManagement from './components/MarketManagement';
import { syncToCloud, subscribeToCloudData, db } from './services/firebaseService';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isCloudEnabled] = useState(!!db);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState('sessions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeFade, setWelcomeFade] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState<'LIMIT' | 'ACTIVATE' | null>(null);
  const [unseenNotification, setUnseenNotification] = useState<Notification | null>(null);
  const [isSubWarningDetailsVisible, setIsSubWarningDetailsVisible] = useState(false);
  const [viewingHallId, setViewingHallId] = useState<string | null>(null);

  // --- SYNC LOOP PREVENTION REFS ---
  const isIncomingFromCloud = useRef<Record<string, boolean>>({});
  const syncDebounceTimers = useRef<Record<string, number>>({});

  // --- GLOBAL DATA STATES ---
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('cuemaster_users');
    return saved ? JSON.parse(saved) : [INITIAL_ADMIN];
  });
  
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('cuemaster_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // --- HALL-SPECIFIC DATA STATES ---
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [players, setPlayers] = useState<string[]>([]);
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [tournamentHistory, setTournamentHistory] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [backups, setBackups] = useState<any[]>([]);

  // --- STORAGE KEY HELPER ---
  const getHallKey = (base: string) => {
    const hid = currentUser?.hallId || 'global';
    return `${base}_${hid}`;
  };

  // --- HELPER: Debounced Cloud Sync ---
  const debouncedSync = (key: string, data: any, hallId?: string) => {
    if (!isCloudEnabled || !dataLoaded) return;
    
    // If this change was triggered by an incoming cloud update, skip the sync back
    if (isIncomingFromCloud.current[key]) {
      isIncomingFromCloud.current[key] = false;
      return;
    }

    if (syncDebounceTimers.current[key]) {
      window.clearTimeout(syncDebounceTimers.current[key]);
    }

    syncDebounceTimers.current[key] = window.setTimeout(() => {
      syncToCloud(key, data, hallId);
    }, 1500); // 1.5s debounce to batch updates
  };

  // --- MULTI-TENANCY DATA LOADING ---
  useEffect(() => {
    if (!currentUser) {
      setDataLoaded(false);
      return;
    }
    const hid = currentUser.hallId || 'global';
    const load = (key: string, defaultVal: any) => {
      const saved = localStorage.getItem(`cuemaster_${key}_${hid}`);
      return saved ? JSON.parse(saved) : defaultVal;
    };
    setSessions(load('sessions', []));
    setTransactions(load('transactions', []));
    setPlayers(load('players', []));
    setSettings(load('settings', DEFAULT_SETTINGS));
    setTournamentData(load('tournament_data', null));
    setTournamentHistory(load('tournament_history', []));
    setAttendanceRecords(load('attendance', []));
    setBackups(load('backups', []));
    
    // Small delay to ensure state is settled before enabling sync effects
    setTimeout(() => setDataLoaded(true), 100);
  }, [currentUser]);

  // Check for unseen notifications
  useEffect(() => {
    if (!currentUser || !currentUser.hallId) return;
    
    const seenIds = JSON.parse(localStorage.getItem(`seen_notes_${currentUser.id}`) || '[]');
    const relevantNotes = notifications
      .filter(n => n.hallId === currentUser.hallId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    const unseen = relevantNotes.find(n => !seenIds.includes(n.id));
    if (unseen) {
      setUnseenNotification(unseen);
    }
  }, [currentUser, notifications]);

  const hasUnseenMessages = useMemo(() => {
    if (!currentUser || !currentUser.hallId) return false;
    const seenIds = JSON.parse(localStorage.getItem(`seen_notes_${currentUser.id}`) || '[]');
    return notifications.some(n => n.hallId === currentUser.hallId && !seenIds.includes(n.id));
  }, [currentUser, notifications]);

  const dismissNotification = () => {
    if (unseenNotification && currentUser) {
      const seenIds = JSON.parse(localStorage.getItem(`seen_notes_${currentUser.id}`) || '[]');
      localStorage.setItem(`seen_notes_${currentUser.id}`, JSON.stringify([...seenIds, unseenNotification.id]));
      setUnseenNotification(null);
    }
  };

  // --- CLOUD SYNC EFFECTS ---
  useEffect(() => {
    if (!isCloudEnabled || !currentUser?.hallId || !dataLoaded) return;
    const hid = currentUser.hallId;
    
    const updateHandler = (key: string, setter: Function, currentData: any) => (newData: any) => {
      if (!newData) return;
      // Deep check: Only update if the cloud data is actually different from local state
      if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
        isIncomingFromCloud.current[key] = true;
        setter(newData);
      }
    };

    const unsubscribers = [
      subscribeToCloudData('sessions', updateHandler('sessions', setSessions, sessions), hid),
      subscribeToCloudData('transactions', updateHandler('transactions', setTransactions, transactions), hid),
      subscribeToCloudData('players', updateHandler('players', setPlayers, players), hid),
      subscribeToCloudData('attendance', updateHandler('attendance', setAttendanceRecords, attendanceRecords), hid),
      subscribeToCloudData('tournamentData', (data) => {
        if (JSON.stringify(data) !== JSON.stringify(tournamentData)) {
          isIncomingFromCloud.current['tournamentData'] = true;
          setTournamentData(data);
        }
      }, hid),
      subscribeToCloudData('tournamentHistory', updateHandler('tournamentHistory', setTournamentHistory, tournamentHistory), hid),
      subscribeToCloudData('settings', updateHandler('settings', setSettings, settings), hid),
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [isCloudEnabled, currentUser?.hallId, dataLoaded]);

  useEffect(() => {
    if (!isCloudEnabled || !currentUser) return;
    const unsubUsers = subscribeToCloudData('users', (data) => {
      if (data && JSON.stringify(data) !== JSON.stringify(users)) {
        isIncomingFromCloud.current['users'] = true;
        setUsers(data);
        localStorage.setItem('cuemaster_users', JSON.stringify(data));
      }
    });
    const unsubNotes = subscribeToCloudData('notifications', (data) => {
      if (data && JSON.stringify(data) !== JSON.stringify(notifications)) {
        isIncomingFromCloud.current['notifications'] = true;
        setNotifications(data);
        localStorage.setItem('cuemaster_notifications', JSON.stringify(data));
      }
    });
    return () => { unsubUsers(); unsubNotes(); };
  }, [isCloudEnabled, currentUser]);

  // --- LOCAL STORAGE & CLOUD SAVE EFFECTS ---
  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_sessions'), JSON.stringify(sessions));
    debouncedSync('sessions', sessions, currentUser.hallId);
  }, [sessions]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_transactions'), JSON.stringify(transactions));
    debouncedSync('transactions', transactions, currentUser.hallId);
  }, [transactions]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem('cuemaster_users', JSON.stringify(users));
    debouncedSync('users', users);
  }, [users]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem('cuemaster_notifications', JSON.stringify(notifications));
    debouncedSync('notifications', notifications);
  }, [notifications]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_settings'), JSON.stringify(settings));
    debouncedSync('settings', settings, currentUser.hallId);
  }, [settings]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_players'), JSON.stringify(players));
    debouncedSync('players', players, currentUser.hallId);
  }, [players]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_attendance'), JSON.stringify(attendanceRecords));
    debouncedSync('attendance', attendanceRecords, currentUser.hallId);
  }, [attendanceRecords]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_tournament_data'), JSON.stringify(tournamentData));
    debouncedSync('tournamentData', tournamentData, currentUser.hallId);
  }, [tournamentData]);

  useEffect(() => {
    if (!dataLoaded || !currentUser) return;
    localStorage.setItem(getHallKey('cuemaster_tournament_history'), JSON.stringify(tournamentHistory));
    debouncedSync('tournamentHistory', tournamentHistory, currentUser.hallId);
  }, [tournamentHistory]);

  const t = translations[settings.language];
  const isRTL = settings.language === 'ckb';
  const isDark = settings.theme === 'dark';

  // --- SUBSCRIPTION STATUS LOGIC ---
  const subStatus = useMemo(() => {
    if (!currentUser || currentUser.role === Role.ADMIN) return { isExpired: false, daysRemaining: 999 };
    const manager = users.find(u => u.hallId === currentUser.hallId && u.role === Role.MANAGER);
    if (!manager || !manager.subscriptionExpiresAt) return { isExpired: false, daysRemaining: 999 };
    
    const diff = manager.subscriptionExpiresAt - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return { isExpired: days <= 0, daysRemaining: days };
  }, [currentUser, users]);

  // Auto-logout if expired
  useEffect(() => {
    if (currentUser && subStatus.isExpired && currentUser.role !== Role.ADMIN) {
      processLogout();
    }
  }, [subStatus.isExpired, currentUser]);

  const activeUsageSession = useMemo(() => {
    if (!currentUser || currentUser.role !== Role.MANAGER) return null;
    const limits = currentUser.usageLimits;
    if (!limits) return null;
    return limits.history.find(s => Date.now() < s.expiresAt) || null;
  }, [currentUser]);

  const monthlyUsageCount = useMemo(() => {
    if (!currentUser || currentUser.role !== Role.MANAGER || !currentUser.usageLimits) return 0;
    const now = new Date();
    return currentUser.usageLimits.history.filter(s => {
      const d = new Date(s.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [currentUser]);

  const handleGamesModuleAccess = (targetTab: string) => {
    if (currentUser?.role !== Role.MANAGER) { setActiveTab(targetTab); return; }
    if (activeUsageSession) { setActiveTab(targetTab); } 
    else {
      const max = currentUser.usageLimits?.maxUsesPerMonth || 4;
      if (monthlyUsageCount >= max) setShowUsageModal('LIMIT');
      else setShowUsageModal('ACTIVATE');
    }
  };

  const activateQuotaSession = () => {
    if (!currentUser || currentUser.role !== Role.MANAGER) return;
    const duration = currentUser.usageLimits?.sessionDurationHours || 5;
    const newSession: UsageSession = { timestamp: Date.now(), expiresAt: Date.now() + (duration * 60 * 60 * 1000) };
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        const updatedLimits = { ...u.usageLimits!, history: [...(u.usageLimits?.history || []), newSession] };
        const updatedUser = { ...u, usageLimits: updatedLimits };
        setCurrentUser(updatedUser);
        return updatedUser;
      }
      return u;
    }));
    setShowUsageModal(null);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('sessions'); // Always reset to Active Tables on login
    if (user.role !== Role.ADMIN) {
      setShowWelcome(true);
      setWelcomeFade(false);
      setTimeout(() => setWelcomeFade(true), 4000); 
      setTimeout(() => setShowWelcome(false), 5500); 
    }
  };

  const processLogout = () => { setCurrentUser(null); setDataLoaded(false); setShowLogoutConfirm(false); };
  const handleLogoutRequest = () => {
    if (currentUser?.role === Role.ADMIN) { processLogout(); return; }
    const hour = new Date().getHours();
    if (hour >= 15 && hour < 19) setShowLogoutConfirm(true);
    else processLogout();
  };

  const toggleTheme = () => setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  const toggleLanguage = () => setSettings(prev => ({ ...prev, language: prev.language === 'en' ? 'ckb' : 'en' }));

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} t={t} isRTL={isRTL} />;
  if (!dataLoaded) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><RotateCw className="animate-spin text-emerald-500" size={48} /></div>;

  const isAdmin = currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER;
  const isSuperAdmin = currentUser.role === Role.ADMIN;
  const hasPermission = (perm: string) => currentUser.permissions.includes('all') || currentUser.permissions.includes(perm);

  const renderContent = () => {
    switch (activeTab) {
      case 'hall-details': return viewingHallId ? <HallStatsViewer hallId={viewingHallId} users={users} t={t} isRTL={isRTL} onBack={() => setActiveTab('hall-mgmt')} /> : null;
      case 'hall-mgmt': return <SuperAdminPanel users={users} setUsers={setUsers} t={t} isRTL={isRTL} isDark={isDark} notifications={notifications} setNotifications={setNotifications} onViewHall={(hid) => { setViewingHallId(hid); setActiveTab('hall-details'); }} />;
      case 'dashboard': return isAdmin ? <Dashboard transactions={transactions} users={users} settings={settings} t={t} currentUser={currentUser} /> : <RestrictedAccess t={t} />;
      case 'sessions': return <SessionManager sessions={sessions} setSessions={setSessions} setTransactions={setTransactions} settings={settings} currentUser={currentUser} players={players} setPlayers={setPlayers} t={t} />;
      case 'market': return isAdmin ? <MarketManagement settings={settings} setSettings={setSettings} t={t} isRTL={isRTL} isDark={isDark} /> : <RestrictedAccess t={t} />;
      case 'tables': return <TableManager transactions={transactions} settings={settings} setSettings={setSettings} t={t} isRTL={isRTL} isDark={isDark} />;
      case 'history': return <HistoryView transactions={transactions} setTransactions={setTransactions} users={users} isAdmin={isAdmin} currentUser={currentUser} t={t} />;
      case 'matches': return <MatchHistory transactions={transactions} t={t} isRTL={isRTL} isDark={isDark} isAdmin={isAdmin} />;
      case 'tournament': return <TournamentManager players={players} tournamentData={tournamentData} setTournamentData={setTournamentData} tournamentHistory={tournamentHistory} setTournamentHistory={setTournamentHistory} t={t} isRTL={isRTL} isDark={isDark} isAdmin={isAdmin} settings={settings} />;
      case 'wheel': return <WheelOfFortune t={t} isRTL={isRTL} isDark={isDark} settings={settings} setSettings={setSettings} isAdmin={isAdmin} />;
      case 'attendance': return <AttendanceManager attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} currentUser={currentUser} t={t} isRTL={isRTL} isDark={isDark} isAdmin={isAdmin} />;
      case 'players': return <PlayerManagement players={players} setPlayers={setPlayers} setTransactions={setTransactions} setSessions={setSessions} t={t} isRTL={isRTL} />;
      case 'debts': return <DebtManager transactions={transactions} setTransactions={setTransactions} isAdmin={isAdmin} t={t} isRTL={isRTL} />;
      case 'users': return <UserManagement users={users} setUsers={setUsers} t={t} currentUser={currentUser} />;
      case 'messages': return <NotificationsView notifications={notifications} currentUser={currentUser} t={t} isRTL={isRTL} isDark={isDark} />;
      case 'settings': return <AdminSettings settings={settings} setSettings={setSettings} backups={backups} onRestore={() => {}} setBackups={setBackups} t={t} currentUser={currentUser} />;
      default: return null;
    }
  };

  return (
    <div className={`h-screen flex transition-colors duration-300 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Welcome Screen */}
      {showWelcome && currentUser.role !== Role.ADMIN && (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center transition-all duration-[2000ms] ${welcomeFade ? 'opacity-0 pointer-events-none' : 'backdrop-blur-[80px] bg-slate-900/90'}`}>
           <div className={`text-center space-y-12 p-10 transform transition-all duration-[1200ms] ${welcomeFade ? 'scale-110 -translate-y-5 opacity-0' : 'scale-100'}`}>
              <div className="mx-auto w-40 h-40 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-[3.5rem] flex items-center justify-center shadow-2xl border-4 border-white/20"><Sparkles size={80} className="animate-pulse" /></div>
              <h2 className="text-6xl font-black text-white drop-shadow-2xl">{isRTL ? `بەخێربێیت بۆ ${currentUser.hallId || 'هۆڵەکە'}` : `Welcome to Hall: ${currentUser.hallId || 'Global'}`}</h2>
           </div>
        </div>
      )}

      {/* Subscription Warning */}
      {isSubWarningDetailsVisible && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={() => setIsSubWarningDetailsVisible(false)}>
           <div 
             className={`p-10 rounded-[3rem] border backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col items-center gap-6 max-w-md w-full animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-800/80 border-rose-500/30' : 'bg-white border-rose-200'}`}
             onClick={(e) => e.stopPropagation()}
           >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <div className="w-24 h-24 bg-rose-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-500/20 mb-2">
                 <AlertTriangle size={48} className="text-white animate-pulse" />
              </div>
              <div className="text-center space-y-3">
                 <h4 className="text-xs font-black text-rose-500 uppercase tracking-[0.3em]">{isRTL ? 'ئاگاداری گرنگ' : 'Important Notice'}</h4>
                 <p className={`text-2xl font-black leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {(settings.subscriptionWarningMsg || t.subscriptionWarning).replace('{0}', subStatus.daysRemaining.toString())}
                 </p>
                 <p className="text-slate-500 text-sm font-medium italic">
                    {isRTL ? 'تکایە پێش تەواوبوونی کاتەکە نوێی بکەرەوە بۆ ئەوەی سیستمەکە نەوەستێت.' : 'Please renew your subscription before it expires to avoid system disruption.'}
                 </p>
              </div>
              <button 
                onClick={() => setIsSubWarningDetailsVisible(false)} 
                className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
              >
                <CheckCircle2 size={24} />
                {t.dismiss}
              </button>
           </div>
        </div>
      )}

      {/* Sidebar */}
      <nav className={`${isSidebarOpen ? 'w-64' : 'w-20'} h-screen flex flex-col transition-all duration-300 ease-in-out ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isRTL ? 'border-l' : 'border-r'} shrink-0`}>
        <div className="p-6 flex items-center justify-between shrink-0">
          <h1 className={`text-2xl font-bold text-emerald-500 flex items-center gap-2 overflow-hidden whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}><Activity size={28} />{t.appName}</h1>
          {!isSidebarOpen && <Activity size={28} className="text-emerald-500 mx-auto" />}
        </div>
        
        <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar pb-10">
          <NavItem active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={<Play size={20} />} label={t.activeTables} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          {isAdmin && <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label={t.history} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />}
          <NavItem active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} icon={<BookOpen size={20} />} label={t.debts} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          
          {(hasPermission('tournament') || hasPermission('wheel')) && (
            <div className="space-y-1">
              <button 
                onClick={() => isSidebarOpen ? setIsGamesMenuOpen(!isGamesMenuOpen) : handleGamesModuleAccess('tournament')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''} ${isDark ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-100'} ${activeTab === 'tournament' || activeTab === 'wheel' ? (isDark ? 'bg-indigo-600/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : ''}`}
              >
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}><Trophy size={20} className={`shrink-0 ${activeUsageSession ? 'text-emerald-500' : ''}`} />{isSidebarOpen && <span className="font-bold text-sm truncate">{t.gamesAndPrizes}</span>}</div>
                {isSidebarOpen && (isGamesMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>
              {isGamesMenuOpen && isSidebarOpen && (
                <div className={`space-y-1 animate-in slide-in-from-top-2 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                  {hasPermission('tournament') && <NavItem active={activeTab === 'tournament'} onClick={() => handleGamesModuleAccess('tournament')} icon={<Trophy size={16} />} label={t.tournament} isRTL={isRTL} isDark={isDark} subItem />}
                  {hasPermission('wheel') && <NavItem active={activeTab === 'wheel'} onClick={() => handleGamesModuleAccess('wheel')} icon={<RotateCw size={16} />} label={t.wheel} isRTL={isRTL} isDark={isDark} subItem />}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-slate-700/30 my-4"></div>
          {isAdmin && <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label={t.dashboard} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />}
          {isAdmin && <NavItem active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<ShoppingBasket size={20} />} label={t.market} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />}
          {isAdmin && <NavItem active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<Clock size={20} />} label={t.attendance} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />}
          <NavItem active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} icon={<Swords size={20} />} label={t.matches} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          
          {isAdmin && (
            <>
              <div className={`pt-4 pb-2 px-2 text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'} ${!isSidebarOpen && 'hidden'}`}>Admin Control</div>
              <NavItem active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={<LayoutGrid size={20} />} label={t.tableMgmt} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'players'} onClick={() => setActiveTab('players')} icon={<Users2 size={20} />} label={t.managePlayers} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={20} />} label={t.users} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label={t.settings} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
            </>
          )}

          {isSuperAdmin && (
            <>
              <div className={`pt-4 pb-2 px-2 text-[10px] font-bold uppercase ${isDark ? 'text-indigo-500' : 'text-indigo-400'} ${!isSidebarOpen && 'hidden'}`}>System Registry</div>
              <NavItem active={activeTab === 'hall-mgmt' || activeTab === 'hall-details'} onClick={() => setActiveTab('hall-mgmt')} icon={<Building2 size={20} />} label={t.hallManagement} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
            </>
          )}
        </div>

        <div className={`shrink-0 p-4 border-t ${isDark ? 'border-slate-700/50 bg-slate-800/80' : 'border-slate-100 bg-slate-50/50'} ${!isSidebarOpen ? 'items-center' : ''}`}>
           <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse text-right' : ''} ${!isSidebarOpen ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shrink-0 shadow-lg">
                {currentUser.username[0].toUpperCase()}
              </div>
              {isSidebarOpen && (
                <div className="min-w-0">
                  <p className={`text-sm font-black truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{currentUser.username}</p>
                  <p className="text-[8px] text-indigo-400 font-black uppercase truncate">{currentUser.hallId || 'GLOBAL'}</p>
                </div>
              )}
           </div>
           <button 
             onClick={handleLogoutRequest} 
             className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 font-black hover:bg-rose-500/10 rounded-xl transition-all ${isRTL ? 'flex-row-reverse' : ''} ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
           >
             <LogOut size={20} /> {isSidebarOpen && t.logout}
           </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-screen">
        {showLogoutConfirm && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[900] flex items-center justify-center p-6"><div className="bg-slate-800 border border-slate-700 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center space-y-8"><div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={40} /></div><div className="space-y-4"><h3 className="text-2xl font-black text-white">{isRTL ? "ئاگاداری کۆتایی کات" : "Shift End Warning"}</h3><p className="text-slate-400 font-bold leading-relaxed">{isRTL ? "ئەم چوونە دەرەوەیە بە واتای کۆتایی کاتی کارکردنتە. ئایا دڵنیای؟" : "Logging out now marks the end of your shift. Proceed?"}</p></div><div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-2xl">{t.cancel}</button><button onClick={processLogout} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg">{t.logout}</button></div></div></div>)}
        
        <header className={`h-16 shrink-0 backdrop-blur-sm border-b transition-colors duration-300 flex items-center px-4 md:px-8 justify-between ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/70 border-slate-200'} ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 md:gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"><Menu size={24} /></button>
            <div className="flex flex-col">
              <h2 className={`text-sm md:text-base font-black capitalize ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {activeTab === 'hall-details' ? (isRTL ? 'داشبۆردی هۆڵ' : 'Hall Dashboard') : (activeTab === 'hall-mgmt' ? t.hallManagement : (t[activeTab] || activeTab))}
              </h2>
              <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}><div className="w-1 h-1 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{currentUser.hallId || 'GLOBAL'}</span></div>
            </div>
          </div>
          <div className={`flex items-center gap-3 md:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-1 p-1 pr-1 md:pr-3 rounded-full border transition-all ${isDark ? 'bg-slate-800/10 border-slate-700/40 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-emerald-300'} ${isRTL ? 'flex-row-reverse' : ''}`}>
               <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isCloudEnabled ? "text-emerald-500" : "text-rose-500"} ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Cloud size={12} />
                  <span className="text-[8px] font-black uppercase tracking-tighter hidden sm:inline">{isCloudEnabled ? t.cloudSynced : 'OFFLINE'}</span>
               </div>
               <div className="w-px h-4 bg-slate-700/30 mx-1"></div>
               <button onClick={() => setActiveTab('messages')} className={`relative p-2 rounded-full transition-all group ${activeTab === 'messages' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-700/30'}`}>
                 <MessageSquare size={16} className={hasUnseenMessages ? 'animate-pulse' : ''} />
                 {hasUnseenMessages && (<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900 animate-bounce"></span>)}
               </button>
               {subStatus.daysRemaining <= 3 && subStatus.daysRemaining > 0 && (
                 <>
                   <div className="w-px h-4 bg-slate-700/30 mx-1"></div>
                   <button onClick={() => setIsSubWarningDetailsVisible(true)} className="p-2 rounded-full text-rose-500 hover:bg-rose-500/10 transition-all animate-pulse">
                     <AlertTriangle size={18} />
                   </button>
                 </>
               )}
            </div>
            <button onClick={toggleLanguage} className={`px-3 py-1.5 rounded-full border font-black text-[10px] ${isDark ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'}`}>{settings.language === 'en' ? 'کوردی' : 'EN'}</button>
            <button onClick={toggleTheme} className={`p-2 rounded-full border ${isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-indigo-600'}`}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; isRTL: boolean; isDark: boolean; collapsed?: boolean; restricted?: boolean; subItem?: boolean; }> = ({ active, onClick, icon, label, isRTL, isDark, collapsed, restricted, subItem }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''} ${collapsed ? 'justify-center' : ''} ${active ? (isDark ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm') : (isDark ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-100')} ${restricted ? 'opacity-50 grayscale' : ''} ${subItem ? 'py-2 px-6 border-l-2 border-slate-700/50 rounded-none' : ''}`} title={collapsed ? label : undefined}>
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span className={`font-bold ${subItem ? 'text-xs' : 'text-sm'} truncate`}>{label}</span>}
  </button>
);

const RestrictedAccess: React.FC<{ t: any }> = ({ t }) => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center"><div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6"><Lock size={40} /></div><h2 className="text-2xl font-black text-white mb-2 uppercase">{t.accessRestricted}</h2><p className="text-slate-400 max-w-sm">{t.noPermissionMsg}</p></div>);

export default App;

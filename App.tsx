
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Role, Session, Transaction, AppSettings, Theme, AttendanceRecord, UsageSession, Notification } from './types';
import { INITIAL_ADMIN, DEFAULT_SETTINGS } from './constants';
import { translations } from './translations';
import { LogIn, LayoutDashboard, Users, Play, History, Settings, LogOut, TrendingUp, BookOpen, Users2, Moon, Sun, Trophy, RotateCw, Menu, Lock, LayoutGrid, Activity, Save, Swords, Languages, Clock, CheckCircle2, AlertTriangle, X, Sparkles, Heart, Database, Cloud, CloudOff, Building2, ChevronDown, ChevronUp, ShieldAlert, Timer, UserCircle, Bell, MessageSquare, BarChart3, ShoppingBasket, Gauge, Zap, Eye, Search, MessageCircle, Store, Sparkle, Power } from 'lucide-react';
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
import SuperAdminPanel from './components/SuperAdminPanel';
import NotificationsView from './components/NotificationsView';
import HallStatsViewer from './components/HallStatsViewer';
import MarketManagement from './components/MarketManagement';
import TableTimelineView from './components/TableTimelineView';
import Marketplace from './components/Marketplace';
import AttendanceManager from './components/AttendanceManager';
import { syncToCloud, subscribeToCloudData, db } from './services/firebaseService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isCloudEnabled] = useState(!!db);

  const [activeTab, setActiveTab] = useState('sessions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState(false);
  const [viewingHallId, setViewingHallId] = useState<string | null>(null);

  const isIncomingFromCloud = useRef<Record<string, boolean>>({});
  const syncDebounceTimers = useRef<Record<string, number>>({});

  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [players, setPlayers] = useState<string[]>([]);
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [tournamentSetupParticipants, setTournamentSetupParticipants] = useState<any[]>([]);
  const [tournamentHistory, setTournamentHistory] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [backups, setBackups] = useState<any[]>([]);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth Helpers
  const isAdmin = currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER;
  const isManager = currentUser?.role === Role.MANAGER;
  const isSuperAdmin = currentUser?.role === Role.ADMIN && currentUser?.username.toLowerCase() === 'admin';
  
  const hasPermission = (perm: string) => 
    currentUser?.permissions?.includes('all') || 
    currentUser?.permissions?.includes(perm) || 
    isAdmin;

  const getBusinessDate = () => {
    const now = new Date();
    if (now.getHours() < 8) {
      const prev = new Date(now);
      prev.setDate(prev.getDate() - 1);
      return prev.toISOString().split('T')[0];
    }
    return now.toISOString().split('T')[0];
  };

  const handleAutoCheckIn = (user: User) => {
    if (!user.hallId || user.role !== Role.STAFF) return;
    const isoDate = getBusinessDate();
    const now = Date.now();
    const hid = user.hallId;

    setAttendanceRecords(prev => {
      const records = Array.isArray(prev) ? prev : [];
      const existingIdx = records.findIndex(r => r.userId === user.id && r.date === isoDate);
      
      let updated;
      if (existingIdx !== -1) {
        updated = records.map((r, idx) => 
          idx === existingIdx ? { ...r, username: user.username } : r
        );
      } else {
        const newLog: AttendanceRecord = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.id,
          username: user.username,
          hallId: user.hallId!,
          clockIn: now,
          clockOut: null,
          logouts: [],
          date: isoDate
        };
        updated = [newLog, ...records];
      }

      localStorage.setItem(`cuemaster_attendance_logs_${hid}`, JSON.stringify(updated));
      if (isCloudEnabled) syncToCloud('attendance_logs', updated, hid);
      return updated;
    });
  };

  const handleAutoCheckOut = (user: User) => {
    if (!user.hallId || user.role !== Role.STAFF) return;
    const isoDate = getBusinessDate();
    const now = Date.now();
    const hid = user.hallId;

    setAttendanceRecords(prev => {
      const records = Array.isArray(prev) ? prev : [];
      const updated = records.map(r => {
        if (r.userId === user.id && r.date === isoDate) {
          return { ...r, clockOut: now };
        }
        return r;
      });

      localStorage.setItem(`cuemaster_attendance_logs_${hid}`, JSON.stringify(updated));
      if (isCloudEnabled) syncToCloud('attendance_logs', updated, hid);
      return updated;
    });
  };

  const handleLogout = async () => {
    if (currentUser && currentUser.role === Role.STAFF) {
      handleAutoCheckOut(currentUser);
    }
    setCurrentUser(null);
  };

  const handleLogin = (user: User) => {
    setShowWelcome(true);
    setCurrentUser(user);
    if (user.role === Role.STAFF) {
      handleAutoCheckIn(user);
    }
    setActiveTab('sessions');
  };

  useEffect(() => {
    if (!isCloudEnabled) return;
    const unsubscribe = subscribeToCloudData('users', (cloudUsers) => {
      if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        isIncomingFromCloud.current['users'] = true;
        setUsers(cloudUsers);
      } else {
        setUsers([INITIAL_ADMIN]);
      }
    }, 'MAIN');
    return () => unsubscribe();
  }, [isCloudEnabled]);

  useEffect(() => {
    if (!isCloudEnabled) return;
    const unsubscribe = subscribeToCloudData('notifications', (cloudNotes) => {
      if (cloudNotes) {
        isIncomingFromCloud.current['notifications'] = true;
        setNotifications(cloudNotes);
      }
    }); 
    return () => unsubscribe();
  }, [isCloudEnabled]);

  useEffect(() => {
    if (!currentUser) { setDataLoaded(false); return; }
    const hid = currentUser.hallId || 'global';
    const load = (key: string, defaultVal: any) => {
      try {
        const saved = localStorage.getItem(`cuemaster_${key}_${hid}`);
        const parsed = saved ? JSON.parse(saved) : defaultVal;
        return (Array.isArray(defaultVal) && !Array.isArray(parsed)) ? defaultVal : (parsed || defaultVal);
      } catch { return defaultVal; }
    };
    setSessions(load('sessions', []));
    setTransactions(load('transactions', []));
    setPlayers(load('players', []));
    setSettings(load('settings', DEFAULT_SETTINGS));
    setTournamentData(load('tournament_data', null));
    setTournamentSetupParticipants(load('tournament_setup_parts', []));
    setTournamentHistory(load('tournament_history', []));
    setAttendanceRecords(load('attendance_logs', []));
    setBackups(load('backups', []));
    setTimeout(() => setDataLoaded(true), 200);
  }, [currentUser]);

  useEffect(() => {
    if (!isCloudEnabled || !currentUser?.hallId || !dataLoaded) return;
    const hid = currentUser.hallId;
    const subscribe = (key: string, setter: Function) => {
      return subscribeToCloudData(key, (newData) => {
        if (!newData) return;
        setter((prev: any) => {
          if (JSON.stringify(newData) === JSON.stringify(prev)) return prev;
          isIncomingFromCloud.current[key] = true;
          localStorage.setItem(`cuemaster_${key}_${hid}`, JSON.stringify(newData));
          return newData;
        });
      }, hid);
    };
    const unsubscribers = [
      subscribe('sessions', setSessions),
      subscribe('transactions', setTransactions),
      subscribe('players', setPlayers),
      subscribe('attendance_logs', setAttendanceRecords),
      subscribe('tournament_data', setTournamentData),
      subscribe('tournament_setup_parts', setTournamentSetupParticipants),
      subscribe('tournament_history', setTournamentHistory),
      subscribe('settings', setSettings),
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [isCloudEnabled, currentUser?.hallId, dataLoaded]);

  const debouncedSync = (key: string, data: any, hallId?: string, immediate = false) => {
    if (!isCloudEnabled || !dataLoaded) return;
    if (isIncomingFromCloud.current[key]) {
      isIncomingFromCloud.current[key] = false;
      return;
    }
    if (syncDebounceTimers.current[key]) window.clearTimeout(syncDebounceTimers.current[key]);
    if (immediate) {
      syncToCloud(key, data, hallId);
    } else {
      syncDebounceTimers.current[key] = window.setTimeout(() => syncToCloud(key, data, hallId), 1500);
    }
  };

  useEffect(() => { if (dataLoaded && currentUser) debouncedSync('sessions', sessions, currentUser?.hallId); }, [sessions]);
  useEffect(() => { if (dataLoaded && currentUser) debouncedSync('transactions', transactions, currentUser?.hallId); }, [transactions]);
  useEffect(() => { if (dataLoaded && currentUser && isSuperAdmin) debouncedSync('users', users, 'MAIN'); }, [users]);
  useEffect(() => { if (dataLoaded && currentUser) debouncedSync('settings', settings, currentUser?.hallId); }, [settings]);
  useEffect(() => { if (dataLoaded && currentUser) debouncedSync('players', players, currentUser?.hallId); }, [players]);

  const t = translations[settings.language] || translations['en'];
  const isRTL = settings.language === 'ckb';
  const isDark = settings.theme === 'dark';

  const formatDuration = (startMs: number, endMs?: number | null) => {
    const start = startMs;
    const end = endMs ? endMs : Date.now();
    const diff = end - start;
    const totalSecs = Math.floor(diff / 1000);
    if (totalSecs < 0) return "0h 0m";
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const activeRecord = useMemo(() => {
    if (!currentUser || currentUser.role !== Role.STAFF) return null;
    const isoDate = getBusinessDate();
    return attendanceRecords.find(r => r.userId === currentUser.id && r.date === isoDate);
  }, [attendanceRecords, currentUser]);

  const handleGlobalNotify = async (text: string) => {
    const newNote: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      text: text,
      hallId: 'MAIN',
      timestamp: Date.now(),
      isRead: false
    };
    const updated = [newNote, ...notifications];
    setNotifications(updated);
    if (isCloudEnabled) await syncToCloud('notifications', updated);
  };

  const handleMarkAsRead = async (noteId: string) => {
    const updated = notifications.map(n => n.id === noteId ? { ...n, isRead: true } : n);
    setNotifications(updated);
    if (isCloudEnabled) await syncToCloud('notifications', updated);
  };

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    const contextHallId = isSuperAdmin ? 'MAIN' : currentUser.hallId;
    return notifications.filter(n => n.hallId === contextHallId && !n.isRead).length;
  }, [notifications, currentUser, isSuperAdmin]);

  const renderContent = () => {
    switch (activeTab) {
      case 'sessions': return <SessionManager sessions={sessions} setSessions={setSessions} setTransactions={setTransactions} settings={settings} currentUser={currentUser!} players={players} setPlayers={setPlayers} t={t} />;
      case 'dashboard': return isAdmin ? <Dashboard transactions={transactions} users={users} settings={settings} t={t} currentUser={currentUser!} attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} /> : <RestrictedAccess t={t} />;
      case 'history': return isAdmin ? <HistoryView transactions={transactions} setTransactions={setTransactions} users={users} isAdmin={isAdmin} currentUser={currentUser!} t={t} /> : <RestrictedAccess t={t} />;
      case 'debts': return <DebtManager transactions={transactions} setTransactions={setTransactions} isAdmin={isAdmin} t={t} isRTL={isRTL} currentUser={currentUser!} />;
      case 'marketplace': return hasPermission('marketplace') ? <Marketplace currentUser={currentUser!} t={t} isRTL={isRTL} isDark={isDark} sendNotification={handleGlobalNotify} /> : <RestrictedAccess t={t} />;
      case 'market': return isAdmin ? <MarketManagement settings={settings} setSettings={setSettings} t={t} isRTL={isRTL} isDark={isDark} /> : <RestrictedAccess t={t} />;
      case 'table-audit': return isAdmin ? <TableTimelineView transactions={transactions} settings={settings} setSettings={setSettings} t={t} isRTL={isRTL} isDark={isDark} onDeleteTransactions={(ids) => setTransactions(prev => prev.filter(tr => !ids.includes(tr.id)))} /> : <RestrictedAccess t={t} />;
      case 'table-mgmt': return isAdmin ? <TableManager transactions={transactions} settings={settings} setSettings={setSettings} t={t} isRTL={isRTL} isDark={isDark} /> : <RestrictedAccess t={t} />;
      case 'players': return isAdmin ? <PlayerManagement players={players} setPlayers={setPlayers} setTransactions={setTransactions} setSessions={setSessions} t={t} isRTL={isRTL} hallId={currentUser?.hallId} /> : <RestrictedAccess t={t} />;
      case 'users': return isAdmin ? <UserManagement users={users} setUsers={setUsers} t={t} currentUser={currentUser!} /> : <RestrictedAccess t={t} />;
      case 'settings': return isAdmin ? <AdminSettings settings={settings} setSettings={setSettings} backups={backups} onRestore={() => {}} setBackups={setBackups} t={t} currentUser={currentUser!} /> : <RestrictedAccess t={t} />;
      case 'tournament': return hasPermission('tournament') ? <TournamentManager players={players} tournamentData={tournamentData} setTournamentData={setTournamentData} setupParticipants={tournamentSetupParticipants} setSetupParticipants={setTournamentSetupParticipants} tournamentHistory={tournamentHistory} setTournamentHistory={setTournamentHistory} t={t} isRTL={isRTL} isDark={isDark} isAdmin={isAdmin} settings={settings} /> : <RestrictedAccess t={t} />;
      case 'wheel': return hasPermission('wheel') ? <WheelOfFortune t={t} isRTL={isRTL} isDark={isDark} settings={settings} setSettings={setSettings} isAdmin={isAdmin} /> : <RestrictedAccess t={t} />;
      case 'matches': return <MatchHistory transactions={transactions} t={t} isRTL={isRTL} isDark={isDark} isAdmin={isAdmin} />;
      case 'hall-mgmt': 
        if (isSuperAdmin) return <SuperAdminPanel users={users} setUsers={setUsers} t={t} isRTL={isRTL} isDark={isDark} notifications={notifications} setNotifications={setNotifications} onViewHall={(hid) => { setViewingHallId(hid); setActiveTab('hall-details'); }} />;
        // Removed manager access to hall-mgmt as requested
        return <RestrictedAccess t={t} />;
      case 'hall-details': return isSuperAdmin && viewingHallId ? <HallStatsViewer hallId={viewingHallId} users={users} t={t} isRTL={isRTL} onBack={() => setActiveTab('hall-mgmt')} /> : <RestrictedAccess t={t} />;
      case 'messages': return <NotificationsView notifications={notifications} currentUser={currentUser!} t={t} isRTL={isRTL} isDark={isDark} onMarkRead={handleMarkAsRead} />;
      case 'attendance': return <AttendanceManager attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} currentUser={currentUser!} t={t} isRTL={isRTL} isDark={isDark} isAdmin={isAdmin} />;
      default: return null;
    }
  };

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} t={t} isRTL={isRTL} />;
  if (!dataLoaded) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><RotateCw className="animate-spin text-emerald-500" size={48} /></div>;

  return (
    <div className={`h-screen flex transition-colors duration-300 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <nav className={`${isSidebarOpen ? 'w-64' : 'w-20'} h-screen flex flex-col transition-all duration-300 ease-in-out ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isRTL ? 'border-l' : 'border-r'} shrink-0`}>
        <div className="p-6 flex items-center justify-between shrink-0">
          <h1 className={`text-2xl font-black text-emerald-500 flex items-center gap-2 overflow-hidden whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>
            <Activity size={32} /> {t.appName}
          </h1>
          {!isSidebarOpen && <Activity size={28} className="text-emerald-500 mx-auto" />}
        </div>
        <div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-10">
          <NavItem active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={<Play size={20} />} label={t.activeTables} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          {isAdmin && <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label={t.history} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />}
          <NavItem active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} icon={<BookOpen size={20} />} label={t.debts} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          
          {hasPermission('marketplace') && (
            <NavItem active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} icon={<Store size={20} />} label={t.marketplace} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          )}
          
          {(hasPermission('tournament') || hasPermission('wheel')) && (
            <div className="space-y-1">
              <button onClick={() => isSidebarOpen ? setIsGamesMenuOpen(!isGamesMenuOpen) : setActiveTab('tournament')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-50 hover:bg-slate-100'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}><Trophy size={20} />{isSidebarOpen && <span className="font-bold text-sm">{t.gamesAndPrizes}</span>}</div>
                {isSidebarOpen && (isGamesMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>
              {isGamesMenuOpen && isSidebarOpen && (
                <div className={`space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                  {hasPermission('tournament') && <NavItem active={activeTab === 'tournament'} onClick={() => setActiveTab('tournament')} icon={<Trophy size={16} />} label={t.tournament} isRTL={isRTL} isDark={isDark} subItem />}
                  {hasPermission('wheel') && <NavItem active={activeTab === 'wheel'} onClick={() => setActiveTab('wheel')} icon={<RotateCw size={16} />} label={t.wheel} isRTL={isRTL} isDark={isDark} subItem />}
                </div>
              )}
            </div>
          )}
          
          {isAdmin && (
            <NavItem active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} icon={<Swords size={20} />} label={t.playedTogether} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
          )}

          <div className="h-px bg-slate-700/30 my-4"></div>

          {isAdmin && (
            <>
              <NavItem active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<ShoppingBasket size={20} />} label={t.market} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'table-mgmt'} onClick={() => setActiveTab('table-mgmt')} icon={<LayoutGrid size={20} />} label={t.tableMgmt} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'table-audit'} onClick={() => setActiveTab('table-audit')} icon={<Eye size={20} />} label={t.tableAudit} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'players'} onClick={() => setActiveTab('players')} icon={<Users2 size={20} />} label={t.managePlayers} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={20} />} label={t.users} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
              <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label={t.settings} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
            </>
          )}

          {isSuperAdmin && (
            <>
              <div className="h-px bg-slate-700/30 my-4"></div>
              <NavItem active={activeTab === 'hall-mgmt' || activeTab === 'hall-details'} onClick={() => setActiveTab('hall-mgmt')} icon={<Building2 size={20} />} label={t.hallManagement} isRTL={isRTL} isDark={isDark} collapsed={!isSidebarOpen} />
            </>
          )}
        </div>
        
        <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} space-y-2`}>
           <div className={`flex items-center gap-3 px-4 py-3 mb-1 rounded-2xl transition-all ${isDark ? 'bg-slate-900/40 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'} ${isRTL ? 'flex-row-reverse' : ''} ${!isSidebarOpen ? 'justify-center px-0 bg-transparent border-none' : ''}`}>
              <div className="relative shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg ${isAdmin ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                  {currentUser?.username[0].toUpperCase()}
                </div>
                {activeRecord && currentUser?.role === Role.STAFF && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                )}
              </div>
              {isSidebarOpen && (
                <div className={`flex flex-col min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs font-black text-white truncate">{currentUser?.username}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">
                      {activeRecord && currentUser?.role === Role.STAFF 
                        ? formatDuration(activeRecord.clockIn) 
                        : (currentUser?.role === Role.ADMIN ? t.admin : currentUser?.role === Role.MANAGER ? t.manager : t.offDuty)}
                    </span>
                  </div>
                </div>
              )}
           </div>
           <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 font-black hover:bg-rose-500/10 rounded-xl transition-all ${isRTL ? 'flex-row-reverse' : ''} ${!isSidebarOpen ? 'justify-center' : ''}`}>
             <LogOut size={20} /> {isSidebarOpen && t.logout}
           </button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative flex flex-col h-screen">
        <header className={`h-16 shrink-0 backdrop-blur-sm border-b transition-colors duration-300 flex items-center px-4 md:px-8 justify-between relative ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/70 border-slate-200'} ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"><Menu size={24} /></button>
            {activeRecord && currentUser?.role === Role.STAFF && (
              <div className={`flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.onDuty}</span>
              </div>
            )}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            {isAdmin && (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full border transition-all text-sm font-black shadow-lg active:scale-95 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white border-indigo-500 ring-4 ring-indigo-500/15' : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-indigo-600/15 hover:text-indigo-400'}`}
              >
                <LayoutDashboard size={18} /> {t.dashboard}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setActiveTab('messages')} className={`p-2.5 rounded-full border transition-all relative ${activeTab === 'messages' ? 'bg-indigo-600 text-white border-indigo-500' : 'border-slate-700 text-slate-400'}`} title={t.messages}>
               <MessageCircle size={18} />
               {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                   {unreadCount}
                 </span>
               )}
             </button>
             <button onClick={() => setSettings(s => ({...s, language: s.language === 'en' ? 'ckb' : 'en'}))} className="p-2.5 bg-slate-800 rounded-full text-indigo-400" title={t.language}><Languages size={18} /></button>
             <button onClick={() => setSettings(s => ({...s, theme: s.theme === 'dark' ? 'light' : 'dark'}))} className="p-2.5 bg-slate-800 rounded-full text-amber-400">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">{renderContent()}</div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; isRTL: boolean; isDark: boolean; collapsed?: boolean; subItem?: boolean; }> = ({ active, onClick, icon, label, isRTL, isDark, collapsed, subItem }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''} ${collapsed ? 'justify-center' : ''} ${active ? (isDark ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-sm' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm') : (isDark ? 'text-slate-400 hover:bg-slate-700/50' : 'text-slate-500 hover:bg-slate-100')} ${subItem ? 'py-2 px-6 border-l-2 border-slate-700/50 rounded-none' : ''}`} title={collapsed ? label : undefined}>
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span className={`font-bold ${subItem ? 'text-xs' : 'text-sm'} truncate`}>{label}</span>}
  </button>
);

const RestrictedAccess: React.FC<{ t: any }> = ({ t }) => (<div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-700"><div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 shadow-xl"><Lock size={40} /></div><h2 className="text-2xl font-black text-white mb-2 uppercase">{t.accessRestricted}</h2><p className="text-slate-400 max-w-sm">{t.noPermissionMsg}</p></div>);

export default App;

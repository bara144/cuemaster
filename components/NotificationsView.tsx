
import React from 'react';
import { Notification, User, Role } from '../types';
// ShieldInfo is not a valid export from lucide-react. Replacing with Info.
import { Bell, MessageSquare, Clock, Info, Trash2 } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  currentUser: User;
  t: any;
  isRTL: boolean;
  isDark: boolean;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, currentUser, t, isRTL, isDark }) => {
  const hallNotes = notifications
    .filter(n => n.hallId === currentUser.hallId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(isRTL ? 'ku-Arab-IQ' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} ${isRTL ? 'text-right' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-30"></div>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
             <MessageSquare size={32} />
           </div>
           <div className={isRTL ? 'text-right' : ''}>
              <h3 className="text-2xl font-black text-white">{t.messages}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official System Announcements</p>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {hallNotes.length === 0 ? (
          <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
             <Bell size={48} className="mx-auto mb-4 opacity-10" />
             <p className="font-bold opacity-30">{t.noMessages}</p>
          </div>
        ) : hallNotes.map((note) => (
          <div 
            key={note.id} 
            className={`p-6 rounded-[2rem] border transition-all hover:border-indigo-500/50 shadow-lg ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}
          >
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
               <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Info size={20} />
               </div>
               <div className="flex-1 space-y-3">
                  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                     <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.systemMessageTitle}</span>
                     <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold">{formatDate(note.timestamp)}</span>
                     </div>
                  </div>
                  <p className={`text-slate-200 text-lg leading-relaxed whitespace-pre-wrap font-medium ${isRTL ? 'text-right' : ''}`}>
                    {note.text}
                  </p>
               </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-3">
         <Info className="text-indigo-400 shrink-0 mt-0.5" size={16} />
         <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
           {isRTL 
             ? 'تێبینی: تەنها بەڕێوبەری باڵا دەسەڵاتی ناردنی پەیامی هەیە. ئەم پەیامانە بۆ هەموو ستاف و بەڕێوەبەرانی ئەم هۆڵە دەردەکەون.'
             : 'Note: Only the Super Administrator has permission to broadcast messages. These updates are visible to all staff and managers of this hall.'}
         </p>
      </div>
    </div>
  );
};

export default NotificationsView;

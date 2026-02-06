import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MarketplaceItem, MarketplaceOrder, Role, User, ItemStatus } from '../types';
import { ShoppingBag, Plus, Trash2, Package, Tag, Clock, CheckCircle, AlertCircle, Image as ImageIcon, Send, X, ClipboardList, Building2, Store, ChevronLeft, ChevronRight, Eye, Info, Loader2, CheckCircle2, FileText, ShoppingCart, Archive, History, Minus, Phone, MapPin } from 'lucide-react';
import { syncToCloud, subscribeToCloudData, compressImage } from '../services/firebaseService';

interface MarketplaceProps {
  currentUser: User;
  t: any;
  isRTL: boolean;
  isDark: boolean;
  sendNotification?: (text: string) => Promise<void>;
}

const Marketplace: React.FC<MarketplaceProps> = ({ currentUser, t, isRTL, isDark, sendNotification }) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedItemForOrder, setSelectedItemForOrder] = useState<MarketplaceItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MarketplaceItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // States for Long-Press Delete
  const [pressingItemId, setPressingItemId] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const pressTimerRef = useRef<number | null>(null);
  
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: 0,
    status: 'AVAILABLE' as ItemStatus,
    imageUrls: [] as string[]
  });

  useEffect(() => {
    const unsubItems = subscribeToCloudData('marketplace_items', (data) => {
      if (data) setItems(data);
    }, 'GLOBAL_STORE');
    const unsubOrders = subscribeToCloudData('marketplace_orders', (data) => {
      if (data) setOrders(data);
    }, 'GLOBAL_STORE');
    return () => { unsubItems(); unsubOrders(); };
  }, []);

  const activeOrders = useMemo(() => orders.filter(o => o.status === 'PENDING'), [orders]);
  const archivedOrders = useMemo(() => orders.filter(o => o.status === 'COMPLETED'), [orders]);

  const isAdmin = currentUser.role === Role.ADMIN && currentUser.username.toLowerCase() === 'admin';
  const isManager = currentUser.role === Role.MANAGER;

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsSaving(true);
      try {
        const compressedB64: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const compressed = await compressImage(files[i]);
          compressedB64.push(compressed);
        }
        setNewItem(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...compressedB64] }));
      } catch (err) { console.error(err); } finally { setIsSaving(false); }
    }
  };

  const removeImageFromNewItem = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const addItem = async () => {
    if (!newItem.name || !newItem.price || isSaving) return;
    setIsSaving(true);
    const item: MarketplaceItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      description: newItem.description,
      price: newItem.price,
      status: newItem.status,
      imageUrls: newItem.imageUrls,
      timestamp: Date.now()
    };
    const updated = [item, ...items];
    setItems(updated);
    await syncToCloud('marketplace_items', updated, 'GLOBAL_STORE');
    setIsAddModalOpen(false);
    setNewItem({ name: '', description: '', price: 0, status: 'AVAILABLE', imageUrls: [] });
    setIsSaving(false);
  };

  const placeOrder = async () => {
    if (!selectedItemForOrder || isSaving) return;
    setIsSaving(true);

    const totalPrice = selectedItemForOrder.price * orderQuantity;

    const order: MarketplaceOrder = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: selectedItemForOrder.id,
      itemName: selectedItemForOrder.name,
      hallId: currentUser.hallId || 'UNKNOWN',
      managerName: currentUser.username,
      phoneNumber: currentUser.phoneNumber || '', // Send phone
      address: currentUser.address || '', // Send address
      notes: orderNotes,
      quantity: orderQuantity,
      totalPrice: totalPrice,
      timestamp: Date.now(),
      status: 'PENDING'
    };

    const updatedOrders = [order, ...orders];
    
    try {
      await syncToCloud('marketplace_orders', updatedOrders, 'GLOBAL_STORE');
      setOrders(updatedOrders);

      if (sendNotification) {
        const notifyText = isRTL 
          ? `📦 داواکاری نوێ هات:\n🏢 هۆڵ: ${currentUser.hallId}\n👤 بەڕێوەبەر: ${currentUser.username}\n📞 مۆبایل: ${currentUser.phoneNumber || 'دیاری نەکراوە'}\n📍 ناونیشان: ${currentUser.address || 'دیاری نەکراوە'}\n🛍 کاڵا: ${selectedItemForOrder.name}\n🔢 بڕ: ${orderQuantity} دانە\n💰 کۆی نرخ: ${totalPrice.toLocaleString()} IQD\n📝 تێبینی: ${orderNotes || 'نییە'}`
          : `📦 New Order:\nHall: ${currentUser.hallId}\nManager: ${currentUser.username}\nPhone: ${currentUser.phoneNumber || 'N/A'}\nAddress: ${currentUser.address || 'N/A'}\nItem: ${selectedItemForOrder.name}\nQty: ${orderQuantity}\nTotal: ${totalPrice.toLocaleString()} IQD\nNotes: ${orderNotes || 'None'}`;
        await sendNotification(notifyText);
      }

      setSelectedItemForOrder(null);
      setOrderNotes('');
      setOrderQuantity(1);
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const archiveOrder = async (id: string) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: 'COMPLETED' as const } : o);
    setOrders(updated);
    await syncToCloud('marketplace_orders', updated, 'GLOBAL_STORE');
  };

  // Improved Delete Logic with Long Press Support
  const deleteItem = async (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    await syncToCloud('marketplace_items', updated, 'GLOBAL_STORE');
    alert(isRTL ? 'کاڵاکە بە سەرکەوتوویی سڕایەوە!' : 'Item deleted successfully!');
  };

  const startDeletePress = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    setPressingItemId(id);
    setDeleteProgress(0);
    const start = Date.now();
    
    if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    
    pressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setDeleteProgress(progress);
      
      if (elapsed >= 2000) {
        stopDeletePress();
        deleteItem(id);
      }
    }, 30);
  };

  const stopDeletePress = () => {
    if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    setPressingItemId(null);
    setDeleteProgress(0);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Banner */}
      <div className={`p-10 rounded-[3rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
               <Store size={40} />
             </div>
             <div className={isRTL ? 'text-right' : ''}>
               <h3 className="text-4xl font-black text-white tracking-tight">{t.marketplace}</h3>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Billiard Hall Trading Center</p>
             </div>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button onClick={() => setShowArchive(!showArchive)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all ${showArchive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {showArchive ? <History size={20} /> : <Archive size={20} />}
                {showArchive ? (isRTL ? 'گەڕانەوە' : 'Back') : (isRTL ? 'ئەرشیف' : 'Archive')}
              </button>
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-2xl active:scale-95">
                <Plus size={24} /> {t.addMarketItem}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main List */}
        <div className={`xl:col-span-${isAdmin ? '8' : '12'}`}>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map(item => {
                const isPressing = pressingItemId === item.id;
                return (
                <div key={item.id} onClick={() => { setViewingItem(item); setActiveImageIndex(0); }} className={`flex flex-col rounded-[2.5rem] border overflow-hidden transition-all duration-500 cursor-pointer hover:shadow-2xl hover:-translate-y-2 group ${isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200 shadow-xl'}`}>
                   <div className="h-64 overflow-hidden bg-slate-900 relative">
                      {item.imageUrls?.[0] ? (
                        <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : <div className="w-full h-full flex items-center justify-center text-slate-700"><ImageIcon size={64} /></div>}
                      <div className="absolute bottom-4 left-4">
                         <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase text-white shadow-lg ${item.status === 'AVAILABLE' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{t[item.status.toLowerCase()]}</span>
                      </div>
                   </div>
                   <div className="p-8 flex-1 flex flex-col">
                      <h4 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{item.name}</h4>
                      <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-700/30">
                        <span className="text-2xl font-black text-emerald-400">{item.price.toLocaleString()} <span className="text-xs">IQD</span></span>
                        <div className="flex gap-2">
                           {isAdmin && (
                             <div className="relative group/del">
                               <button 
                                 onMouseDown={(e) => startDeletePress(e, item.id)}
                                 /* Fixed typo: stopDeleteProgress to stopDeletePress */
                                 onMouseUp={stopDeletePress}
                                 onMouseLeave={stopDeletePress}
                                 onTouchStart={(e) => startDeletePress(e, item.id)}
                                 onTouchEnd={stopDeletePress}
                                 onClick={(e) => e.stopPropagation()}
                                 className={`p-3 relative overflow-hidden bg-rose-500/10 text-rose-500 rounded-2xl transition-all shadow-lg active:scale-90 ${isPressing ? 'ring-2 ring-rose-500' : 'hover:bg-rose-500 hover:text-white'}`}
                               >
                                 {isPressing && (
                                   <div 
                                     className="absolute bottom-0 left-0 h-full bg-rose-600/40 transition-all ease-linear"
                                     style={{ width: `${deleteProgress}%` }}
                                   />
                                 )}
                                 <Trash2 size={20} className="relative z-10" />
                               </button>
                               {!isPressing && (
                                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black py-1 px-2 rounded opacity-0 group-hover/del:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                   {isRTL ? '٢ چرکە ڕایبگرە بۆ سڕینەوە' : 'Hold 2s to Delete'}
                                 </div>
                               )}
                             </div>
                           )}
                           <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <ChevronRight size={24} className={isRTL ? 'rotate-180' : ''} />
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              );})}
           </div>
        </div>

        {/* Admin Sidebar Orders */}
        {isAdmin && (
          <div className="xl:col-span-4 space-y-8 animate-in slide-in-from-right-4 duration-700">
             <div className={`p-8 rounded-[3rem] border shadow-2xl h-full flex flex-col ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                   <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><ClipboardList size={24} /></div>
                      <h4 className="text-xl font-black text-white tracking-tight">{showArchive ? (isRTL ? 'ئەرشیفی داواکاری' : 'Archived Orders') : (isRTL ? 'داواکاری نوێ' : 'New Orders')}</h4>
                   </div>
                   <span className="bg-slate-900 px-3 py-1 rounded-lg text-xs font-black text-indigo-400 border border-slate-700">
                     {showArchive ? archivedOrders.length : activeOrders.length}
                   </span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                   {(showArchive ? archivedOrders : activeOrders).map(order => (
                      <div key={order.id} className={`p-6 rounded-[2rem] border transition-all ${order.status === 'COMPLETED' ? 'opacity-60 border-slate-700 bg-slate-900' : 'border-indigo-500/30 bg-indigo-500/5'}`}>
                         <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                 <p className="text-lg font-black text-white truncate">{order.itemName}</p>
                                 <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg">x{order.quantity || 1}</span>
                               </div>
                               <div className={`flex items-center gap-1.5 mt-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <Building2 size={12} className="text-indigo-400" />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.hallId} ({order.managerName})</span>
                               </div>
                               
                               {/* Added: Direct info for admin in order list */}
                               <div className="mt-2 space-y-1">
                                  {order.phoneNumber && (
                                     <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Phone size={10} className="text-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-300 font-mono tracking-tighter">{order.phoneNumber}</span>
                                     </div>
                                  )}
                                  {order.address && (
                                     <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <MapPin size={10} className="text-rose-500" />
                                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[200px]">{order.address}</span>
                                     </div>
                                  )}
                               </div>

                               <p className="text-[10px] text-emerald-400 font-bold mt-2 tracking-tight">{(order.totalPrice || 0).toLocaleString()} IQD</p>
                               <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase">{new Date(order.timestamp).toLocaleDateString()}</p>
                            </div>
                            {!showArchive && (
                              <button 
                                onClick={() => archiveOrder(order.id)} 
                                className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-xl active:scale-90"
                                title={isRTL ? 'خستنە ئەرشیف' : 'Mark as Received & Archive'}
                              >
                                <CheckCircle2 size={24} />
                              </button>
                            )}
                         </div>
                         {order.notes && (
                            <div className={`mt-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'text-right' : ''}`}>
                               <p className="text-xs text-slate-400 italic font-medium leading-relaxed">"{order.notes}"</p>
                            </div>
                         )}
                      </div>
                   ))}
                   {(showArchive ? archivedOrders : activeOrders).length === 0 && (
                     <div className="py-20 text-center text-slate-600 opacity-20 italic">
                       {isRTL ? 'هیچ داواکارییەک نییە' : 'Empty List'}
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedItemForOrder && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className={`w-full max-w-lg rounded-[3rem] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                 <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <ShoppingCart size={24} className="text-indigo-400" />
                    <h3 className="text-xl font-black text-white">{isRTL ? 'دڵنیابوونەوە لە داواکاری' : 'Confirm Order'}</h3>
                 </div>
                 <button onClick={() => setSelectedItemForOrder(null)} className="p-2 rounded-full hover:bg-slate-700/50 transition-colors"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-6">
                 <div className={`p-6 rounded-3xl bg-slate-900/50 border border-slate-700/50 space-y-4 ${isRTL ? 'text-right' : ''}`}>
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'کاڵا' : 'Item'}</span>
                       <span className="text-lg font-black text-white">{selectedItemForOrder.name}</span>
                    </div>
                    
                    <div className="h-px bg-slate-700/50"></div>
                    
                    {/* Quantity Picker */}
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'بڕ (دانە)' : 'Quantity'}</span>
                       <div className="flex items-center gap-4 bg-slate-900 rounded-2xl p-1 border border-slate-700">
                          <button 
                            onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                            className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                          >
                             <Minus size={20} />
                          </button>
                          <span className="w-8 text-center font-black text-xl text-white">{orderQuantity}</span>
                          <button 
                            onClick={() => setOrderQuantity(orderQuantity + 1)}
                            className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"
                          >
                             <Plus size={20} />
                          </button>
                       </div>
                    </div>

                    <div className="h-px bg-slate-700/50"></div>

                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{isRTL ? 'نرخی گشتی' : 'Total Price'}</span>
                       <span className="text-2xl font-black text-emerald-400">{(selectedItemForOrder.price * orderQuantity).toLocaleString()} IQD</span>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 ${isRTL ? 'text-right' : ''}`}>{t.orderNotes}</label>
                    <textarea 
                       value={orderNotes}
                       onChange={(e) => setOrderNotes(e.target.value)}
                       placeholder={isRTL ? 'تێبینی تایبەت لێرە بنووسە...' : 'Special instructions...'}
                       className={`w-full min-h-[120px] bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium resize-none ${isRTL ? 'text-right' : ''}`}
                    />
                 </div>

                 <button onClick={placeOrder} disabled={isSaving} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                    {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                    {isRTL ? 'ناردنی داواکاری' : 'Submit Order'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Item View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[250] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
           <div className={`w-full max-w-6xl max-h-[90vh] rounded-[3.5rem] border shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-in zoom-in-95 duration-500 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="lg:w-2/3 h-[400px] lg:h-auto bg-black relative group/gallery">
                 {viewingItem.imageUrls?.[activeImageIndex] ? (
                    <>
                       <img src={viewingItem.imageUrls[activeImageIndex]} className="w-full h-full object-contain animate-in fade-in duration-700" />
                       {viewingItem.imageUrls.length > 1 && (
                         <>
                           <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex - 1 + viewingItem.imageUrls.length) % viewingItem.imageUrls.length); }} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/70 opacity-0 group-hover/gallery:opacity-100 transition-all"><ChevronLeft size={32} /></button>
                           <button onClick={(e) => { e.stopPropagation(); setActiveImageIndex((activeImageIndex + 1) % viewingItem.imageUrls.length); }} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/70 opacity-0 group-hover/gallery:opacity-100 transition-all"><ChevronRight size={32} /></button>
                         </>
                       )}
                    </>
                 ) : <div className="w-full h-full flex flex-col items-center justify-center text-slate-700"><ImageIcon size={100} /></div>}
                 <button onClick={() => setViewingItem(null)} className="absolute top-6 left-6 lg:hidden w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center"><X size={20} /></button>
              </div>
              <div className="lg:w-1/3 p-10 flex flex-col overflow-y-auto custom-scrollbar">
                 <div className={`flex justify-between items-start mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="text-4xl font-black text-white">{viewingItem.name}</h3>
                    <button onClick={() => setViewingItem(null)} className="hidden lg:flex p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-full transition-all"><X size={32} /></button>
                 </div>
                 <div className="space-y-6 flex-1">
                    <div className="flex flex-col bg-slate-900/50 p-6 rounded-3xl border border-slate-700/50">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{t.price}</span>
                       <span className="text-4xl font-black text-emerald-400">{viewingItem.price.toLocaleString()} <span className="text-sm">IQD</span></span>
                    </div>
                    <div className="space-y-3">
                       <h5 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-700 pb-2"><Info size={16} className="text-indigo-400" /> {t.description}</h5>
                       <p className="text-slate-300 leading-relaxed font-medium text-lg whitespace-pre-wrap">{viewingItem.description}</p>
                    </div>
                 </div>
                 <div className="mt-12">
                    {isManager && viewingItem.status !== 'UNAVAILABLE' ? (
                       <button onClick={() => { setSelectedItemForOrder(viewingItem); setViewingItem(null); }} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xl transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"><ShoppingBag size={24} /> {t.orderItem}</button>
                    ) : isAdmin ? null : (
                       <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center"><p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Not Orderable</p></div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[300] flex items-center justify-center p-4">
           <div className={`w-full max-w-3xl rounded-[3.5rem] border shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Plus size={24} /></div>
                    <h3 className="text-3xl font-black text-white">{t.addMarketItem}</h3>
                 </div>
                 <button onClick={() => !isSaving && setIsAddModalOpen(false)} disabled={isSaving} className="p-3 hover:bg-slate-700 rounded-full transition-colors"><X size={32} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold" placeholder="Item Name..." />
                    <input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-black" placeholder="Price IQD" />
                    <select value={newItem.status} onChange={(e) => setNewItem({...newItem, status: e.target.value as ItemStatus})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-bold appearance-none">
                       <option value="AVAILABLE">{t.available}</option>
                       <option value="UNAVAILABLE">{t.unavailable}</option>
                       <option value="COMING_SOON">{t.comingSoon}</option>
                    </select>
                 </div>
                 <textarea value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full h-full min-h-[150px] bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500 font-medium resize-none" placeholder="Details..." />
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gallery ({newItem.imageUrls.length})</label>
                    <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-black text-xs uppercase flex items-center gap-2">
                       <Plus size={16} /> Add Photo
                       <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultipleImagesUpload} disabled={isSaving} />
                    </label>
                 </div>
                 <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 min-h-[100px] p-6 bg-slate-900 rounded-[2rem] border border-slate-700/50">
                    {newItem.imageUrls.map((img, idx) => (
                       <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => removeImageFromNewItem(idx)} disabled={isSaving} className="absolute top-1 right-1 w-6 h-6 bg-rose-600 text-white rounded-lg flex items-center justify-center transition-all shadow-lg active:scale-90"><X size={12} /></button>
                       </div>
                    ))}
                 </div>
              </div>

              <button onClick={addItem} disabled={isSaving} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-[2.5rem] font-black text-2xl transition-all shadow-xl active:scale-98 flex items-center justify-center gap-3">
                 {isSaving ? <Loader2 className="animate-spin" size={24} /> : t.save}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
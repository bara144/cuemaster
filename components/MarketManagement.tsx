
import React, { useState } from 'react';
import { AppSettings, MarketItem, User, Role } from '../types';
import { ShoppingBasket, Plus, Trash2, DollarSign, Package, Search, AlertCircle } from 'lucide-react';

interface MarketManagementProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: any;
  isRTL: boolean;
  isDark: boolean;
}

const MarketManagement: React.FC<MarketManagementProps> = ({ settings, setSettings, t, isRTL, isDark }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number | string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const addMarketItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;

    const newItem: MarketItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      price: Number(newItemPrice)
    };

    setSettings(prev => ({
      ...prev,
      marketItems: [...(prev.marketItems || []), newItem]
    }));

    setNewItemName('');
    setNewItemPrice('');
  };

  const removeMarketItem = (id: string) => {
    if (confirm(isRTL ? 'ئایا دڵنیایت لە سڕینەوەی ئەم بابەتە؟' : 'Are you sure you want to remove this item?')) {
      setSettings(prev => ({
        ...prev,
        marketItems: prev.marketItems.filter(item => item.id !== id)
      }));
    }
  };

  const updatePrice = (id: string, newPrice: number) => {
    setSettings(prev => ({
      ...prev,
      marketItems: prev.marketItems.map(item => 
        item.id === id ? { ...item, price: Math.max(0, newPrice) } : item
      )
    }));
  };

  const filteredItems = (settings.marketItems || []).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header & Add Form */}
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 opacity-30"></div>
        
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 mb-10 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
           <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                <ShoppingBasket size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{t.market}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Inventory & Pricing Management</p>
              </div>
           </div>

           <div className="relative w-full md:w-64">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
              <input 
                type="text"
                placeholder={t.searchPlayers}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 px-12 text-white focus:outline-none focus:border-amber-500 font-bold ${isRTL ? 'text-right' : ''}`}
              />
           </div>
        </div>

        <form onSubmit={addMarketItem} className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-3xl bg-slate-900/50 border border-slate-700/50 ${isRTL ? 'rtl' : 'ltr'}`}>
           <div className="space-y-2">
              <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'ناوی بابەت' : 'Item Name'}</label>
              <div className="relative">
                <Package className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
                <input 
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-amber-500 font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                  placeholder="..."
                />
              </div>
           </div>
           <div className="space-y-2">
              <label className={`block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'نرخ (دینار)' : 'Price (IQD)'}</label>
              <div className="relative">
                <DollarSign className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
                <input 
                  type="number"
                  required
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:border-amber-500 font-bold ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                  placeholder="0"
                />
              </div>
           </div>
           <div className="flex items-end">
              <button 
                type="submit"
                className="w-full h-[50px] bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus size={20} /> {t.addItem}
              </button>
           </div>
        </form>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className={`p-6 rounded-[2rem] border transition-all hover:border-amber-500/50 shadow-xl relative overflow-hidden group ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
               <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black text-xl shadow-inner">
                    {item.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-white leading-tight">{item.name}</h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Verified Item</span>
                  </div>
               </div>
               <button 
                onClick={() => removeMarketItem(item.id)}
                className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
               >
                 <Trash2 size={18} />
               </button>
            </div>

            <div className="space-y-4">
               <div className={isRTL ? 'text-right' : ''}>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">{t.rate}</label>
                  <div className="relative mt-1">
                    <input 
                      type="number"
                      value={item.price}
                      onChange={(e) => updatePrice(item.id, Number(e.target.value))}
                      className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-emerald-400 font-black focus:outline-none focus:border-emerald-500 ${isRTL ? 'pr-4 pl-12 text-right' : 'pl-4 pr-12'}`}
                    />
                    <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 ${isRTL ? 'left-4' : 'right-4'}`}>IQD</div>
                  </div>
               </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
             <ShoppingBasket size={48} className="opacity-10" />
             <p className="font-bold opacity-30">{isRTL ? 'هیچ بابەتێک نەدۆزرایەوە' : 'No items found.'}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
         <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
         <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
           {isRTL 
             ? 'تێبینی: هەر گۆڕانکارییەک لێرە ئەنجامی بدەیت ڕاستەوخۆ کار دەکاتە سەر لیستی فرۆشتنی ستافەکان لە بەشی یارییە چالاکەکان.'
             : 'Note: Any changes made here will immediately update the market menu for staff in the Active Tables section.'}
         </p>
      </div>
    </div>
  );
};

export default MarketManagement;

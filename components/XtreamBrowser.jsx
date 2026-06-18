'use client';

import { useState, useEffect } from 'react';
import ChannelList from './ChannelList';
import { Loader2, LogOut, ChevronLeft } from 'lucide-react';

export default function XtreamBrowser({ credentials, onSelectChannel, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/xtream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credentials,
          action: 'get_live_categories'
        })
      });
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannels = async (categoryId) => {
    setIsLoading(true);
    setActiveCategory(categoryId);
    try {
      const res = await fetch('/api/xtream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credentials,
          action: 'get_live_streams',
          category_id: categoryId
        })
      });
      if (!res.ok) throw new Error('Failed to fetch channels');
      const data = await res.json();
      
      // Map to standard channel format
      const formattedChannels = data.map(c => ({
        id: c.stream_id,
        name: c.name,
        logo: c.stream_icon,
        group: categories.find(cat => cat.category_id === categoryId)?.category_name,
        // The URL for Xtream streams
        url: `${credentials.serverUrl}/live/${credentials.username}/${credentials.password}/${c.stream_id}.m3u8`
      }));
      
      setChannels(formattedChannels);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !categories.length && !channels.length) {
    return (
      <div className="flex items-center justify-center h-full text-stone-900">
        <Loader2 className="animate-spin w-8 h-8" strokeWidth={3} />
      </div>
    );
  }

  if (activeCategory) {
    return (
      <div className="flex flex-col h-full bg-stone-50 border-2 border-stone-900 rounded-[4px] overflow-hidden">
        <div className="p-1.5 border-b-2 border-stone-900 bg-stone-200 flex items-center justify-between shrink-0">
          <button 
            onClick={() => { setActiveCategory(null); setChannels([]); }}
            className="flex items-center text-[10px] font-black text-stone-900 uppercase border-2 border-stone-900 px-1 py-0.5 bg-amber-400 active:translate-y-0.5 transition-all rounded-[4px]"
          >
            <ChevronLeft size={14} strokeWidth={3} />
            BACK
          </button>
        </div>
        <div className="flex-1 overflow-hidden bg-stone-100 p-1">
          <ChannelList 
            channels={channels} 
            onSelectChannel={onSelectChannel} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50 border-2 border-stone-900 rounded-[4px] overflow-hidden">
      <div className="p-1.5 border-b-2 border-stone-900 bg-stone-200 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-black text-stone-900 uppercase px-1 bg-stone-50 border-2 border-stone-900 rounded-[4px]">Categories</h3>
        <button 
          onClick={onLogout} 
          className="text-stone-50 hover:text-stone-100 bg-red-500 border-2 border-stone-900 px-1.5 py-0.5 active:translate-y-0.5 transition-all rounded-[4px]" 
          title="Logout"
        >
          <LogOut size={12} strokeWidth={3} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1 flex flex-col bg-stone-100">
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => fetchChannels(cat.category_id)}
            className="w-full text-left p-1 mb-1 border-2 border-stone-900 bg-stone-50 hover:bg-stone-200 active:translate-y-0.5 transition-all flex items-center justify-between group rounded-[4px]"
          >
            <span className="truncate pr-2 text-[10px] font-black text-stone-900 uppercase">{cat.category_name}</span>
            <span className="text-[8px] font-bold bg-stone-900 text-stone-50 px-1 border border-stone-900 uppercase group-hover:bg-amber-400 group-hover:text-stone-900 transition-colors rounded-[2px]">
              BROWSE
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

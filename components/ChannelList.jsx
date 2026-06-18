'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Tv } from 'lucide-react';

export default function ChannelList({ channels, onSelectChannel, activeChannel }) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  const groups = useMemo(() => {
    const g = new Set();
    channels.forEach(c => {
      if (c.group) g.add(c.group);
    });
    return ['All', ...Array.from(g).sort()];
  }, [channels]);

  useEffect(() => {
    if (groups.length > 1 && selectedGroup === 'All') {
      const fifa = groups.find(g => g.toLowerCase().includes('fifa'));
      if (fifa) {
        setSelectedGroup(fifa);
      }
    }
  }, [groups]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesGroup = selectedGroup === 'All' || c.group === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [channels, search, selectedGroup]);

  return (
    <div className="flex flex-col h-full bg-stone-50 border-2 border-stone-900 rounded-[4px]">
      <div className="p-1 border-b-2 border-stone-900 bg-stone-200 flex flex-col gap-1 shrink-0">
        <div className="relative border-2 border-stone-900 bg-stone-50 rounded-[4px]">
          <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 text-stone-600" size={12} strokeWidth={3} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent rounded-[4px] py-1 pl-6 pr-1 text-[10px] font-bold focus:outline-none"
          />
        </div>
        
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full bg-amber-400 border-2 border-stone-900 rounded-[4px] py-1 px-1.5 text-[10px] font-black focus:outline-none appearance-none uppercase"
        >
          {groups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-1 flex flex-col bg-stone-100">
        {filteredChannels.length === 0 ? (
          <div className="text-center text-[10px] font-black text-stone-500 py-4 uppercase border-2 border-dashed border-stone-400 rounded-[4px]">
            EMPTY
          </div>
        ) : (
          filteredChannels.map((channel, index) => {
            const isActive = activeChannel?.id === channel.id;
            return (
              <button
                key={`${channel.id}-${index}`}
                onClick={() => onSelectChannel(channel)}
                className={`w-full flex items-center gap-1.5 p-1 border-2 text-left rounded-[4px] mb-1 active:translate-y-0.5 transition-all ${
                  isActive
                    ? 'bg-amber-400 border-stone-900'
                    : 'bg-stone-50 border-stone-900 hover:bg-stone-200'
                }`}
              >
                <div className={`w-5 h-5 shrink-0 border-2 border-stone-900 flex items-center justify-center rounded-[2px] ${isActive ? 'bg-stone-50' : 'bg-stone-200'}`}>
                  {channel.logo ? (
                    <img src={channel.logo} alt="" className="w-full h-full object-contain p-0.5" onError={(e) => e.target.style.display='none'} />
                  ) : (
                    <Tv size={10} strokeWidth={3} className={isActive ? 'text-stone-900' : 'text-stone-600'} />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <div className={`truncate font-black text-[10px] leading-none ${isActive ? 'text-stone-900' : 'text-stone-900'}`}>{channel.name}</div>
                  {channel.group && (
                    <div className={`truncate font-bold text-[8px] leading-none ${isActive ? 'text-stone-800' : 'text-stone-500'}`}>
                      {channel.group}
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Link as LinkIcon, Upload, Loader2, PlaySquare } from 'lucide-react';
import { defaultPlaylistData } from '@/data/ddd';

export default function M3UInput({ onLoadChannels }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/parse-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      if (data.channels && data.channels.length > 0) {
        onLoadChannels(data.channels);
      } else {
        throw new Error('No channels found in this playlist');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDefault = async (content) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/parse-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      if (data.channels && data.channels.length > 0) {
        onLoadChannels(data.channels);
      } else {
        throw new Error('No channels found in this playlist');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();
      const res = await fetch('/api/parse-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      if (data.channels && data.channels.length > 0) {
        onLoadChannels(data.channels);
      } else {
        throw new Error('No channels found in this playlist');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      // Reset input
      e.target.value = null;
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="bg-stone-50 border-[3px] border-stone-900 rounded-[4px] p-2">
        <h2 className="text-[12px] font-black mb-2 text-center text-stone-900 uppercase font-space-mono bg-stone-200 border-2 border-stone-900 py-1 rounded-[4px]">Load M3U Playlist</h2>
        
        <div className="flex flex-col gap-2 mb-2">
          <button
            onClick={() => handleLoadDefault(defaultPlaylistData)}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-2 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-900 border-2 border-stone-900 active:translate-y-0.5 transition-all font-black uppercase text-[10px] rounded-[4px]"
          >
            <PlaySquare size={12} className="fill-stone-900 text-amber-400" />
            FIFA World Cup
          </button>
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t-2 border-stone-900"></div>
          <span className="flex-shrink-0 mx-2 text-stone-900 text-[9px] font-black uppercase">OR</span>
          <div className="flex-grow border-t-2 border-stone-900"></div>
        </div>
        
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-1 mt-1">
          <label className="text-[9px] font-black text-stone-900 uppercase">Playlist URL</label>
          <div className="flex gap-2">
            <div className="relative flex-1 border-2 border-stone-900 bg-stone-50 rounded-[4px]">
              <LinkIcon className="absolute left-1.5 top-1/2 -translate-y-1/2 text-stone-600" size={12} />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://...m3u"
                className="w-full bg-transparent rounded-[4px] py-1.5 pl-6 pr-1 text-[10px] font-bold text-stone-900 placeholder-stone-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!url || isLoading}
              className="px-2 py-1 bg-lime-400 hover:bg-lime-300 disabled:bg-stone-300 disabled:text-stone-500 disabled:border-stone-400 text-stone-900 border-2 border-stone-900 rounded-[4px] active:translate-y-0.5 font-black uppercase text-[10px] transition-all min-w-[50px] flex justify-center items-center"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Load'}
            </button>
          </div>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t-2 border-stone-900"></div>
          <span className="flex-shrink-0 mx-2 text-stone-900 text-[9px] font-black uppercase">OR</span>
          <div className="flex-grow border-t-2 border-stone-900"></div>
        </div>

        <label className="flex flex-col items-center justify-center w-full p-2 border-2 border-stone-900 border-dashed rounded-[4px] bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer group">
          <Upload className="w-5 h-5 mb-1 text-stone-900 group-hover:text-stone-600 transition-colors" />
          <p className="text-[10px] text-stone-900 font-black uppercase text-center">
            Upload File
          </p>
          <p className="text-[8px] text-stone-600 font-bold mt-0.5">.m3u or .m3u8</p>
          <input 
            type="file" 
            className="hidden" 
            accept=".m3u,.m3u8,text/plain"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>

        {error && (
          <div className="mt-2 p-1.5 bg-red-400 border-2 border-stone-900 rounded-[4px] text-stone-900 text-[9px] font-black text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

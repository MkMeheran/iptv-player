'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import M3UInput from '@/components/M3UInput';
import XtreamLogin from '@/components/XtreamLogin';
import { useAppContext } from '@/components/AppProvider';
import { Tv, Play, Server, Zap, Shield, Globe } from 'lucide-react';
import { defaultPlaylistData } from '@/data/ddd';

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setLocalActiveTab] = useState('m3u'); // 'm3u' or 'xtream'
  
  const { 
    setActiveTab, 
    setM3uChannels, 
    setXtreamCredentials, 
    setActiveChannel 
  } = useAppContext();

  // Handlers for when inputs are submitted successfully
  const handleM3uLoad = (channels) => {
    setM3uChannels(channels);
    setActiveTab('m3u');
    router.push('/player');
  };

  const handlePlayFifa = async () => {
    try {
      const res = await fetch('/api/parse-m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: defaultPlaylistData }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.channels && data.channels.length > 0) {
          setM3uChannels(data.channels);
          setActiveTab('m3u');
          router.push('/player');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleXtreamLogin = (credentials) => {
    setXtreamCredentials(credentials);
    setActiveTab('xtream');
    router.push('/player');
  };

  const handleDirectLinkSubmit = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      setActiveChannel({ name: 'Direct Stream', url: e.target.value.trim(), logo: null });
      setActiveTab('direct');
      router.push('/player');
    }
  };

  const renderInputContent = () => {
    return (
      <div className="flex flex-col h-full bg-stone-800 border-[3px] border-stone-900 nesRaised rounded">
        {/* Header Tab Strip */}
        <div className="h-10 bg-stone-900 border-b-2 border-stone-900 flex items-center px-1 justify-between shrink-0">
          <div className="flex gap-1 h-full py-1">
            <button 
              onClick={() => setLocalActiveTab('m3u')} 
              className={`px-3 py-1 text-[11px] font-space font-bold border-2 border-stone-900 rounded-sm transition-transform active:translate-y-0.5 ${activeTab === 'm3u' ? 'bg-amber-400 text-stone-900 nesPressed' : 'bg-stone-700 text-stone-300 nesRaised'}`}
            >
              M3U
            </button>
            <button 
              onClick={() => setLocalActiveTab('xtream')} 
              className={`px-3 py-1 text-[11px] font-space font-bold border-2 border-stone-900 rounded-sm transition-transform active:translate-y-0.5 ${activeTab === 'xtream' ? 'bg-amber-400 text-stone-900 nesPressed' : 'bg-stone-700 text-stone-300 nesRaised'}`}
            >
              API
            </button>
            <button 
              onClick={() => setLocalActiveTab('direct')} 
              className={`px-3 py-1 text-[11px] font-space font-bold border-2 border-stone-900 rounded-sm transition-transform active:translate-y-0.5 ${activeTab === 'direct' ? 'bg-amber-400 text-stone-900 nesPressed' : 'bg-stone-700 text-stone-300 nesRaised'}`}
            >
              LINK
            </button>
          </div>
          <div className="flex gap-1 pr-2 hidden sm:flex">
            <div className="w-2.5 h-2.5 bg-fuchsia-400 border-2 border-stone-900 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-amber-400 border-2 border-stone-900 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-lime-400 border-2 border-stone-900 rounded-sm"></div>
          </div>
        </div>
        
        {/* Input Area */}
        <div className="flex flex-1 items-center justify-center p-4 bg-stone-900 nesPressed m-2 border-2 border-stone-900 rounded">
          {activeTab === 'm3u' ? (
            <div className="w-full max-w-sm">
              <M3UInput onLoadChannels={handleM3uLoad} />
            </div>
          ) : activeTab === 'xtream' ? (
            <div className="w-full max-w-sm">
              <XtreamLogin onLoginSuccess={handleXtreamLogin} />
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full max-w-sm">
              <h2 className="text-[12px] font-space font-black text-amber-400 uppercase">Load Direct Stream</h2>
              <input 
                type="text"
                placeholder="HTTPS://..."
                className="w-full bg-stone-800 border-2 border-stone-900 rounded px-2 py-2 text-[12px] font-bold text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-500 nesPressed"
                onKeyDown={handleDirectLinkSubmit}
              />
              <p className="text-[10px] text-stone-500 font-bold">Press Enter to initialize stream.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-space flex flex-col">
      {/* 1. NAVBAR */}
      <nav className="h-16 border-b-[3px] border-stone-950 bg-stone-900 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 flex items-center justify-center border-2 border-stone-900 rounded nesRaised">
            <Tv size={18} strokeWidth={3} className="text-stone-900" />
          </div>
          <span className="text-xl font-black tracking-widest text-amber-400 font-space-mono uppercase">MEKATV<span className="text-stone-500">.SYS</span></span>
        </div>
        <div className="flex items-center gap-3 text-xs font-black text-stone-400 uppercase">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-lime-400 border border-stone-900 animate-pulse"></div> SYSTEM ONLINE</span>
          <span className="text-stone-600">|</span>
          <span>V.2026.06</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-12 flex-1 w-full">
        
        {/* 2. HERO */}
        <section className="flex flex-col md:flex-row gap-8 items-stretch">
          <div className="md:w-5/12 flex flex-col justify-center gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-800 border-2 border-stone-950 rounded nesRaised w-fit">
              <Zap size={14} className="text-lime-400" />
              <span className="text-[11px] font-black text-stone-200 uppercase tracking-widest">FAST IPTV ENGINE</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black leading-none text-stone-100 uppercase font-space-mono">
              STREAM <br/><span className="text-amber-400">WITHOUT</span><br/>LIMITS
            </h1>
            
            <p className="text-sm text-stone-400 leading-relaxed font-bold max-w-md">
              MEKATV is a robust web player that supports HLS, DASH, and direct stream playback. Bypass restrictions with ease.
            </p>

            <div className="flex gap-4 mt-2">
              <button 
                onClick={handlePlayFifa}
                className="px-6 py-3 bg-amber-400 text-stone-900 font-black text-sm border-2 border-stone-900 rounded nesRaised hover:bg-amber-300 active:translate-y-1 transition-all flex items-center gap-2 uppercase"
              >
                <Play size={16} className="fill-current" /> PLAY FIFA WORLD CUP
              </button>
            </div>
          </div>
          
          <div className="md:w-7/12 relative flex flex-col mt-8 md:mt-0 h-auto self-stretch min-h-[350px]">
            {/* Top Bar Label Strip */}
            <div className="absolute -top-3 right-4 px-2 py-0.5 bg-cyan-400 text-stone-900 text-[10px] font-black border-2 border-stone-900 rounded-sm z-10 nesRaised">
              CONNECT_SOURCE
            </div>
            {renderInputContent()}
          </div>
        </section>

        {/* 3. FEATURES GRID */}
        <section className="flex flex-col gap-6 mt-8">
          <h2 className="text-xl font-black text-stone-200 uppercase font-space-mono border-l-4 border-amber-400 pl-4">CORE_FEATURES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            <div className="bg-stone-800 p-6 border-[3px] border-stone-950 rounded nesRaised flex flex-col gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-stone-900 flex items-center justify-center text-amber-400 border-2 border-stone-950 rounded-sm nesPressed">
                <Globe size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-200 leading-tight uppercase">MULTI-FORMAT</h3>
                <p className="text-xs text-stone-400 font-bold mt-2 leading-snug">Plays HLS, MP4, DASH, and TS formats directly in your browser.</p>
              </div>
            </div>
            
            <div className="bg-stone-800 p-6 border-[3px] border-stone-950 rounded nesRaised flex flex-col gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-stone-900 flex items-center justify-center text-fuchsia-400 border-2 border-stone-950 rounded-sm nesPressed">
                <Server size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-200 leading-tight uppercase">XTREAM API</h3>
                <p className="text-xs text-stone-400 font-bold mt-2 leading-snug">Login with your credentials to browse live tv, movies, and series.</p>
              </div>
            </div>

            <div className="bg-stone-800 p-6 border-[3px] border-stone-950 rounded nesRaised flex flex-col gap-4 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 bg-stone-900 flex items-center justify-center text-cyan-400 border-2 border-stone-950 rounded-sm nesPressed">
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-200 leading-tight uppercase">BUILT-IN PROXY</h3>
                <p className="text-xs text-stone-400 font-bold mt-2 leading-snug">Bypasses CORS and 403 errors using a dedicated server proxy.</p>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* 5. FOOTER */}
      <footer className="h-12 border-t-[3px] border-stone-950 bg-stone-900 flex items-center justify-center shrink-0">
        <p className="text-xs text-stone-500 font-black tracking-widest uppercase">© 2026 MEKATV . SYS NOMINAL</p>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const Player = dynamic(() => import('@/components/Player'), { ssr: false });
import ChannelList from '@/components/ChannelList';
import XtreamBrowser from '@/components/XtreamBrowser';
import { useAppContext } from '@/components/AppProvider';
import { Tv, Menu, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PlayerDashboard() {
  const router = useRouter();
  const { 
    activeTab, 
    m3uChannels, setM3uChannels, 
    xtreamCredentials, setXtreamCredentials, 
    activeChannel, setActiveChannel 
  } = useAppContext();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(!activeChannel);

  const hasSidebarContent = activeTab !== 'direct' && (m3uChannels.length > 0 || xtreamCredentials);

  return (
    <div className="flex flex-col h-screen bg-stone-200 text-stone-900 font-space uppercase overflow-hidden">
      {/* 1. TOP NAVBAR */}
      <nav className="h-12 border-b-[3px] border-stone-900 bg-stone-100 flex items-center justify-between px-2 sm:px-4 shrink-0 z-50">
        <div className="flex items-center gap-2">
          {hasSidebarContent && (
            <button 
              className="lg:hidden p-1 bg-stone-200 border-2 border-stone-900 rounded-[4px] active:translate-y-0.5 transition-all"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={16} strokeWidth={3} /> : <Menu size={16} strokeWidth={3} />}
            </button>
          )}
          
          <Link href="/" className="flex w-7 h-7 bg-stone-200 border-2 border-stone-900 items-center justify-center rounded-[4px] hover:bg-stone-50 active:translate-y-0.5 transition-all">
            <ArrowLeft size={14} strokeWidth={3} />
          </Link>
          
          <div className="flex items-center gap-2 border-2 border-stone-900 bg-amber-400 px-2 py-0.5 ml-2 hidden sm:flex rounded-[4px]">
            <Tv size={14} strokeWidth={3} />
            <span className="text-[12px] font-black tracking-widest font-space-mono">SYS.PLAY</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-black">
          <div className="border-2 border-stone-900 bg-lime-400 px-2 py-0.5 rounded-[4px]">
            ONLINE
          </div>
        </div>
      </nav>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative p-2 lg:p-4 gap-4">
        
        {/* Sidebar */}
        {hasSidebarContent && (
          <aside className={`
            absolute lg:static inset-y-0 left-0 z-40
            w-[280px] sm:w-[320px] lg:w-80 border-[3px] border-stone-900 rounded-[4px] bg-stone-50 flex flex-col
            transition-transform duration-200 ease-out
            ${isSidebarOpen ? 'translate-x-2 lg:translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}
            my-2 lg:my-0 h-[calc(100%-16px)] lg:h-full overflow-hidden
          `}>
            {/* Sidebar Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-stone-100">
              {activeTab === 'm3u' ? (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="p-1.5 border-b-2 border-stone-900 flex justify-between items-center bg-stone-200 shrink-0">
                    <span className="text-[10px] font-black bg-stone-50 border-2 border-stone-900 px-1 py-0.5 rounded-[4px]">CH: {m3uChannels.length}</span>
                    <button 
                      onClick={() => { setM3uChannels([]); setActiveChannel(null); router.push('/'); }} 
                      className="text-[9px] font-black px-2 py-0.5 bg-red-500 text-white border-2 border-stone-900 rounded-[4px] active:translate-y-0.5 transition-all"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-1">
                    <ChannelList 
                      channels={m3uChannels} 
                      onSelectChannel={(ch) => {
                        setActiveChannel(ch);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }} 
                      activeChannel={activeChannel} 
                    />
                  </div>
                </div>
              ) : activeTab === 'xtream' ? (
                <XtreamBrowser 
                  credentials={xtreamCredentials} 
                  onSelectChannel={(ch) => {
                    setActiveChannel(ch);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }} 
                  onLogout={() => { setXtreamCredentials(null); setActiveChannel(null); router.push('/'); }} 
                />
              ) : null}
            </div>
          </aside>
        )}

        {/* Video Player Area */}
        <main className="flex-1 flex flex-col relative z-0 h-full min-h-0 overflow-hidden">
          {activeChannel ? (
            <div className="w-full h-full border-[3px] border-stone-900 bg-black flex flex-col rounded-[4px] overflow-hidden">
              {/* Player Content */}
              <div className="flex-1 relative bg-black min-h-0 overflow-hidden rounded-[4px]">
                <Player streamUrl={activeChannel.url} title={activeChannel.name} logo={activeChannel.logo} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full border-[3px] border-stone-900 bg-stone-100 flex flex-col items-center justify-center text-stone-500 rounded-[4px] overflow-hidden">
              <div className="border-[3px] border-stone-900 p-4 bg-stone-200 flex flex-col items-center rounded-[4px]">
                <Tv size={32} className="mb-2 text-stone-900" strokeWidth={3} />
                <p className="text-[14px] font-black text-stone-900 font-space-mono bg-stone-50 border-2 border-stone-900 px-2 py-1 rounded-[4px]">NO SIGNAL</p>
              </div>
            </div>
          )}
        </main>
        
        {/* Mobile Overlay */}
        {hasSidebarContent && isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

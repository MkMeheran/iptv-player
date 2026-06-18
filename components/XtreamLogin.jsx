'use client';

import { useState } from 'react';
import { Server, User, Key, Loader2 } from 'lucide-react';

export default function XtreamLogin({ onLoginSuccess }) {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serverUrl || !username || !password) return;

    setIsLoading(true);
    setError(null);

    // Clean up server URL
    const cleanUrl = serverUrl.replace(/\/+$/, '');

    try {
      const res = await fetch('/api/xtream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: cleanUrl,
          username,
          password
        }),
      });

      if (!res.ok) throw new Error('Failed to connect to Xtream server');
      
      const data = await res.json();
      
      if (data.user_info && data.user_info.auth === 1) {
        onLoginSuccess({
          serverUrl: cleanUrl,
          username,
          password,
          userInfo: data.user_info
        });
      } else {
        throw new Error('Invalid credentials or inactive account');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-stone-50 border-[3px] border-stone-900 rounded-[4px] p-2 flex flex-col">
      <h2 className="text-[12px] font-black mb-3 text-center text-stone-900 uppercase bg-stone-200 border-2 border-stone-900 py-1 rounded-[4px]">Xtream Login</h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-stone-900 uppercase">Server URL</label>
          <div className="relative border-2 border-stone-900 bg-stone-50 rounded-[4px]">
            <Server className="absolute left-1.5 top-1/2 -translate-y-1/2 text-stone-600" size={12} strokeWidth={3} />
            <input
              type="url"
              required
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://..."
              className="w-full bg-transparent rounded-[4px] py-1.5 pl-6 pr-2 text-[10px] font-bold text-stone-900 focus:outline-none placeholder-stone-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-stone-900 uppercase">Username</label>
          <div className="relative border-2 border-stone-900 bg-stone-50 rounded-[4px]">
            <User className="absolute left-1.5 top-1/2 -translate-y-1/2 text-stone-600" size={12} strokeWidth={3} />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-transparent rounded-[4px] py-1.5 pl-6 pr-2 text-[10px] font-bold text-stone-900 focus:outline-none placeholder-stone-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-stone-900 uppercase">Password</label>
          <div className="relative border-2 border-stone-900 bg-stone-50 rounded-[4px]">
            <Key className="absolute left-1.5 top-1/2 -translate-y-1/2 text-stone-600" size={12} strokeWidth={3} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent rounded-[4px] py-1.5 pl-6 pr-2 text-[10px] font-bold text-stone-900 focus:outline-none placeholder-stone-500"
            />
          </div>
        </div>

        {error && (
          <div className="mt-1 p-1.5 bg-red-400 border-2 border-stone-900 rounded-[4px] text-stone-900 text-[9px] font-black text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 px-2 py-2 bg-amber-400 disabled:bg-stone-300 text-stone-900 border-2 border-stone-900 rounded-[4px] active:translate-y-0.5 transition-all font-black uppercase text-[10px] flex items-center justify-center gap-1.5"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : null}
          {isLoading ? 'Connecting...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

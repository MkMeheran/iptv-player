'use client';

import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('m3u'); // 'm3u', 'xtream', 'direct'
  const [m3uChannels, setM3uChannels] = useState([]);
  const [xtreamCredentials, setXtreamCredentials] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  return (
    <AppContext.Provider 
      value={{ 
        activeTab, setActiveTab, 
        m3uChannels, setM3uChannels, 
        xtreamCredentials, setXtreamCredentials, 
        activeChannel, setActiveChannel 
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}

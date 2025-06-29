'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function AuthDebug() {
  const { user, loading } = useAuth();
  const [tokenStatus, setTokenStatus] = useState<string>('checking...');
  const [lastRefresh, setLastRefresh] = useState<string>('never');

  useEffect(() => {
    // Check token status every 10 seconds
    const interval = setInterval(async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setTokenStatus(token ? 'valid' : 'invalid');
          setLastRefresh(new Date().toLocaleTimeString());
        } catch (error) {
          setTokenStatus('error');
        }
      } else {
        setTokenStatus('no user');
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs opacity-75 max-w-xs">
      <div className="font-bold">Auth Debug</div>
      <div>User: {user ? user.email : 'none'}</div>
      <div>Loading: {loading.toString()}</div>
      <div>Token: {tokenStatus}</div>
      <div>Last Check: {lastRefresh}</div>
      <div>Cookies: {typeof document !== 'undefined' ? 
        (document.cookie.includes('auth-token') ? '✓' : '✗') : 'unknown'}
      </div>
    </div>
  );
}
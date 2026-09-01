// components/RefreshBar.js
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Wire up "load on mount + auto-poll every 3s while tab is visible + manual
 * refresh" for any admin list page. Pass your own async loader function;
 * this hook handles the polling/visibility/cleanup plumbing around it.
 */
export function useAutoRefresh(loadFn, deps = []) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  const run = useCallback(async (isManual) => {
    if (isManual) setRefreshing(true);
    try {
      await loadRef.current();
      setLastUpdated(new Date());
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    run(false);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') run(false);
    }, 3000);
    function onVisible() {
      if (document.visibilityState === 'visible') run(false);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { refreshing, lastUpdated, refreshNow: () => run(true) };
}

/** The visible "Refresh" button + "Updated Xm ago" label, used at the top of every list page. */
export function RefreshBar({ refreshing, lastUpdated, onRefresh, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="btn btn-neutral"
        style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <svg
          viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />
        </svg>
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
      <span style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4A7', display: 'inline-block' }} />
        {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · auto-refreshes every 3s` : 'Loading…'}
      </span>
      {extra}
      <style>{`@keyframes spin{ from{ transform:rotate(0deg); } to{ transform:rotate(360deg); } }`}</style>
    </div>
  );
}

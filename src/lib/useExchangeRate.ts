import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchExchangeQuote, readExchangeQuote, saveExchangeQuote } from './exchangeRate';

export function useExchangeRate() {
  const [quote,setQuote] = useState(readExchangeQuote);
  const [loading,setLoading] = useState(false);
  const [failed,setFailed] = useState(false);
  const alive = useRef(false);
  const current = useRef<AbortController | null>(null);
  const deadline = useRef<number | null>(null);
  const cancel = useCallback(()=>{
    const request = current.current; current.current = null;
    request?.abort();
    if (deadline.current !== null) window.clearTimeout(deadline.current);
    deadline.current = null;
  },[]);
  const refresh = useCallback(async()=>{
    if (!alive.current || current.current) return;
    const controller = new AbortController(); current.current = controller;
    setLoading(true); setFailed(false);
    deadline.current = window.setTimeout(()=>controller.abort(),8000);
    try {
      const value = await fetchExchangeQuote(controller.signal);
      if (alive.current && current.current === controller) {
        setQuote(value); saveExchangeQuote(value);
      }
    } catch {
      if (alive.current && current.current === controller) setFailed(true);
    } finally {
      if (alive.current && current.current === controller) {
        cancel(); setLoading(false);
      }
    }
  },[cancel]);
  useEffect(()=>{
    alive.current = true;
    let foreground = false;
    function resume() {
      if (document.visibilityState !== 'visible') { foreground = false; cancel(); setLoading(false); return; }
      if (!foreground) { foreground = true; void refresh(); }
    }
    function hide() { foreground = false; cancel(); setLoading(false); }
    const initial = window.setTimeout(resume,0);
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('pageshow',resume);
    window.addEventListener('pagehide',hide);
    return ()=>{
      alive.current = false; cancel(); window.clearTimeout(initial);
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('pageshow',resume);
      window.removeEventListener('pagehide',hide);
    };
  },[cancel,refresh]);
  return {quote,loading,failed,refresh};
}

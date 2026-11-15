import { useCallback, useEffect, useRef, useState } from 'react';
import { validCoordinates, type Coordinates } from './distances';

// One live position feeds both the blue map marker and the collection cards.
// Watch only while visible; never persist browser coordinates.
export function useGeolocation() {
  const [position,setPosition] = useState<Coordinates | null>(null);
  const [locating,setLocating] = useState(false);
  const [message,setMessage] = useState('');
  const alive = useRef(false);
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const resumeAllowed = useRef(false);
  const stop = useCallback(() => {
    generation.current++;
    if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
  },[]);
  const request = useCallback((onLocated?:(point:Coordinates) => void) => {
    stop();
    setPosition(null);
    if (!navigator.geolocation) {
      setLocating(false); setMessage('此瀏覽器不支援定位。'); return;
    }
    resumeAllowed.current = true;
    setLocating(true); setMessage('正在取得位置…');
    const current = generation.current;
    watch.current = navigator.geolocation.watchPosition(result => {
      if (!alive.current || generation.current !== current) return;
      const point = { lat:result.coords.latitude,lng:result.coords.longitude };
      setLocating(false);
      if (!validCoordinates(point)) {
        setPosition(null); setMessage('定位資料無效，請再試一次。'); return;
      }
      setPosition(point); setMessage('');
      // Center only for the first fix after an explicit tap. Later movement
      // updates the marker/distances without interrupting map exploration.
      onLocated?.(point); onLocated = undefined;
    },error => {
      if (!alive.current || generation.current !== current) return;
      setPosition(null); setLocating(false);
      setMessage(error.code === 1 ? '請在瀏覽器設定允許此網站使用位置，再點「我的位置」。'
        : error.code === 3 ? '定位逾時，請再點「我的位置」。' : '暫時無法取得位置，請再點「我的位置」。');
      if (error.code === 1) { resumeAllowed.current = false; stop(); }
    },{ enableHighAccuracy:true,timeout:15000,maximumAge:0 });
  },[stop]);
  useEffect(() => {
    alive.current = true;
    let active = true;
    async function resume() {
      if (document.visibilityState !== 'visible') return;
      // Manual requests do not depend on the Permissions API (older Safari).
      let permitted = resumeAllowed.current;
      if (!permitted) {
        try { permitted = (await navigator.permissions?.query({ name:'geolocation' }))?.state === 'granted'; }
        catch { return; }
      }
      if (active && document.visibilityState === 'visible' && permitted && watch.current === null) request();
    }
    function visibility() {
      if (document.visibilityState === 'visible') void resume();
      else { stop(); setPosition(null); setLocating(false); setMessage(''); }
    }
    void resume();
    document.addEventListener('visibilitychange',visibility);
    return () => {
      active = false; alive.current = false; stop();
      document.removeEventListener('visibilitychange',visibility);
    };
  },[request,stop]);
  return {position,locating,message,request};
}

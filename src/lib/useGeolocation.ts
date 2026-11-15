import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from './distances';
import { createLocationTracker, initialLocationState, locationTimeout, type LocationEnvironment } from './locationTracker';

// A cancellable single fix, not continuous movement tracking. clearWatch
// stops GPS after the first result, on timeout, or when the app is hidden.
const locateOnce:LocationEnvironment['locate'] = (success,error) => {
  if (!navigator.geolocation) { error({code:0}); return ()=>{}; }
  let id:number | undefined, settled = false;
  const cancel = () => { settled = true; if (id !== undefined) navigator.geolocation.clearWatch(id); };
  id = navigator.geolocation.watchPosition(result=>{
    if (settled) return;
    cancel(); success(result);
  },failure=>{
    if (settled) return;
    cancel(); error(failure);
  },{enableHighAccuracy:true,maximumAge:0,timeout:locationTimeout});
  if (settled) navigator.geolocation.clearWatch(id);
  return cancel;
};

// Used once by LocationProvider, above all routes. Coordinates stay in memory.
export function useGeolocation() {
  const [state,setState] = useState(initialLocationState);
  const tracker = useRef<ReturnType<typeof createLocationTracker> | null>(null);
  const request = useCallback((onLocated?:(point:Coordinates)=>void)=>tracker.current?.request(onLocated),[]);
  useEffect(()=>{
    const instance = createLocationTracker({
      locate:locateOnce,now:()=>Date.now(),
      schedule:(callback,delay)=>window.setTimeout(callback,delay),cancel:id=>window.clearTimeout(id),
    },setState);
    tracker.current = instance;
    const resume = () => { if (document.visibilityState === 'visible') instance.resume(); else instance.pause(); };
    const hide = () => instance.pause();
    // Deferring the first fix prevents a duplicate request in StrictMode.
    const initial = window.setTimeout(resume,0);
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('pageshow',resume);
    window.addEventListener('pagehide',hide);
    return ()=>{
      window.clearTimeout(initial);
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('pageshow',resume);
      window.removeEventListener('pagehide',hide);
      instance.dispose();
      if (tracker.current === instance) tracker.current = null;
    };
  },[]);
  return {...state,request};
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinates } from './distances';
import { createLocationTracker, initialLocationState, locationTimeout, type LocationEnvironment } from './locationTracker';

// The shared controller keeps this subscription alive only in Japan while
// visible. Minute refreshes use a separate single fix and never restart it.
const subscribeLocation:LocationEnvironment['locate'] = (success,error) => {
  if (!navigator.geolocation) { error({code:0}); return ()=>{}; }
  let id:number | undefined, canceled = false;
  const cancel = () => { canceled = true; if (id !== undefined) navigator.geolocation.clearWatch(id); };
  id = navigator.geolocation.watchPosition(result=>{
    if (!canceled) success(result);
  },failure=>{
    if (!canceled) error(failure);
  },{enableHighAccuracy:true,maximumAge:0,timeout:locationTimeout});
  if (canceled) navigator.geolocation.clearWatch(id);
  return cancel;
};
const refreshLocation:LocationEnvironment['locate'] = (success,error) => {
  if (!navigator.geolocation) { error({code:0}); return ()=>{}; }
  let canceled = false;
  navigator.geolocation.getCurrentPosition(value=>{if (!canceled) success(value);},failure=>{if (!canceled) error(failure);},
    {enableHighAccuracy:true,maximumAge:0,timeout:locationTimeout});
  return ()=>{canceled = true;};
};

// Used once by LocationProvider, above all routes. Coordinates stay in memory.
export function useGeolocation() {
  const [state,setState] = useState(initialLocationState);
  const tracker = useRef<ReturnType<typeof createLocationTracker> | null>(null);
  const request = useCallback((onLocated?:(point:Coordinates)=>void)=>tracker.current?.request(onLocated),[]);
  useEffect(()=>{
    const instance = createLocationTracker({
      locate:subscribeLocation,refresh:refreshLocation,now:()=>Date.now(),
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

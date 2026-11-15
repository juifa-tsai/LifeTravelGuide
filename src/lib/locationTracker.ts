import { validCoordinates, type Coordinates } from './distances';
import { isInJapan } from './japan';

export interface LocationState {
  position:Coordinates | null;
  country:'unknown' | 'japan' | 'outside';
  updatedAt:number | null;
  locating:boolean;
  message:string;
}
export const initialLocationState:LocationState = {position:null,country:'unknown',updatedAt:null,locating:false,message:''};
export const locationInterval = 60000;
export const locationLifetime = 120000;
export const locationTimeout = 15000;
interface Sample {coords:{latitude:number;longitude:number};timestamp:number}
interface LocationError {code:number}
export interface LocationEnvironment {
  locate:(success:(value:Sample)=>void,error:(value:LocationError)=>void)=>()=>void;
  now:()=>number;
  schedule:(callback:()=>void,delay:number)=>number;
  cancel:(id:number)=>void;
}
interface Pending {startedAt:number;callbacks:((point:Coordinates)=>void)[];deadline?:number;cancel?:()=>void}

// One controller for the whole app. Each request takes one fix, cancels its
// sensor subscription, and schedules the next request only after a Japan fix.
export function createLocationTracker(environment:LocationEnvironment,onChange:(value:LocationState)=>void) {
  let state = {...initialLocationState};
  let active = false, disposed = false;
  let pending:Pending | null = null;
  let poll:number | null = null, expiry:number | null = null;
  const publish = (patch:Partial<LocationState>) => { state = {...state,...patch}; if (!disposed) onChange(state); };
  function clearPoll() { if (poll !== null) environment.cancel(poll); poll = null; }
  function clearExpiry() { if (expiry !== null) environment.cancel(expiry); expiry = null; }
  function finish(current:Pending) {
    if (disposed || !active || pending !== current) return false;
    pending = null;
    if (current.deadline !== undefined) environment.cancel(current.deadline);
    current.cancel?.();
    return true;
  }
  function scheduleNext(startedAt:number) {
    clearPoll();
    if (active && !disposed && state.country === 'japan') {
      poll = environment.schedule(()=>{poll = null; request();},Math.max(0,startedAt+locationInterval-environment.now()));
    }
  }
  function fail(current:Pending,error:LocationError) {
    if (!finish(current)) return;
    if (error.code === 0 || error.code === 1) {
      clearExpiry();
      publish({position:null,updatedAt:null,country:'unknown'});
    }
    publish({locating:false,message:error.code === 0 ? '此瀏覽器不支援定位。'
      : error.code === 1 ? '請在瀏覽器設定允許此網站使用位置，再點「我的位置」。'
      : error.code === 3 ? '定位逾時，請再點「我的位置」。' : '暫時無法取得位置，請再點「我的位置」。'});
    scheduleNext(current.startedAt);
  }
  function success(current:Pending,sample:Sample) {
    if (disposed || !active || pending !== current) return;
    const point = {lat:sample.coords.latitude,lng:sample.coords.longitude};
    const age = environment.now()-sample.timestamp;
    if (!validCoordinates(point) || !Number.isFinite(age) || age < -5000 || age > 30000) {
      fail(current,{code:2}); return;
    }
    if (!finish(current)) return;
    clearExpiry();
    publish({position:point,country:isInJapan(point) ? 'japan' : 'outside',updatedAt:sample.timestamp,locating:false,message:''});
    expiry = environment.schedule(()=>{
      expiry = null;
      if (active && !disposed && state.updatedAt === sample.timestamp) publish({position:null,updatedAt:null});
    },Math.max(0,locationLifetime-age));
    scheduleNext(current.startedAt);
    current.callbacks.forEach(callback=>callback(point));
  }
  function request(onLocated?:(point:Coordinates)=>void) {
    if (disposed || !active) return;
    if (pending) { if (onLocated) pending.callbacks.push(onLocated); return; }
    clearPoll();
    const current:Pending = {startedAt:environment.now(),callbacks:onLocated ? [onLocated] : []};
    pending = current;
    publish({locating:true,message:state.position ? '' : '正在取得位置…'});
    // An app deadline also recovers from a browser that never calls back.
    current.deadline = environment.schedule(()=>fail(current,{code:3}),locationTimeout);
    try {
      const cancel = environment.locate(sample=>success(current,sample),error=>fail(current,error));
      if (pending === current) current.cancel = cancel; else cancel();
    } catch { fail(current,{code:2}); }
  }
  function pause() {
    if (!active || disposed) return;
    active = false;
    clearPoll(); clearExpiry();
    const current = pending; pending = null;
    if (current?.deadline !== undefined) environment.cancel(current.deadline);
    current?.cancel?.();
    publish({...initialLocationState});
  }
  return {
    request,
    resume() { if (!disposed && !active) { active = true; request(); } },
    pause,
    dispose() { pause(); disposed = true; },
  };
}

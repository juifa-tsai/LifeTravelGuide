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
  refresh?:LocationEnvironment['locate'];
  now:()=>number;
  schedule:(callback:()=>void,delay:number)=>number;
  cancel:(id:number)=>void;
}
interface Pending {startedAt:number;callbacks:((point:Coordinates)=>void)[];hasFix?:boolean;deadline?:number;cancel?:()=>void}

// One shared subscription follows movement. Minute/manual requests take a
// fresh fix without interrupting that subscription.
export function createLocationTracker(environment:LocationEnvironment,onChange:(value:LocationState)=>void) {
  let state = {...initialLocationState};
  let active = false, disposed = false;
  let pending:Pending | null = null;
  let refreshing:Pending | null = null;
  let poll:number | null = null, expiry:number | null = null;
  const publish = (patch:Partial<LocationState>) => { state = {...state,...patch}; if (!disposed) onChange(state); };
  function clearPoll() { if (poll !== null) environment.cancel(poll); poll = null; }
  function clearExpiry() { if (expiry !== null) environment.cancel(expiry); expiry = null; }
  function finish(current:Pending) {
    if (disposed || !active || (pending !== current && refreshing !== current)) return false;
    if (pending === current) pending = null;
    if (refreshing === current) refreshing = null;
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
  function fail(current:Pending,error:LocationError,deadline = false) {
    if (disposed || !active || (pending !== current && refreshing !== current)) return;
    // A watch timeout is temporary: retain the subscription so the next fix
    // can recover immediately. A fresh existing position needs no warning.
    if (pending === current && !deadline && error.code !== 0 && error.code !== 1) {
      if (current.hasFix && !state.position) publish({locating:false,message:'暫時無法取得位置，請再點「我的位置」。'});
      return;
    }
    if (!finish(current)) return;
    if (error.code === 0 || error.code === 1) {
      if (pending) finish(pending);
      if (refreshing) finish(refreshing);
      clearExpiry();
      publish({position:null,updatedAt:null,country:'unknown'});
    }
    publish({locating:false,message:state.position && error.code !== 1 ? '' : error.code === 0 ? '此瀏覽器不支援定位。'
      : error.code === 1 ? '請在瀏覽器設定允許此網站使用位置，再點「我的位置」。'
      : error.code === 3 ? '定位逾時，請再點「我的位置」。' : '暫時無法取得位置，請再點「我的位置」。'});
    scheduleNext(current.startedAt);
  }
  function success(current:Pending,sample:Sample) {
    if (disposed || !active || (pending !== current && refreshing !== current)) return;
    const point = {lat:sample.coords.latitude,lng:sample.coords.longitude};
    const age = environment.now()-sample.timestamp;
    if (!validCoordinates(point) || !Number.isFinite(age) || age < -5000 || age > 30000) {
      fail(current,{code:2}); return;
    }
    // Watch and minute requests may complete in either order. Never move
    // backwards to an older fix that arrives after a newer movement update.
    const updatedAt = Math.min(sample.timestamp,environment.now());
    if (state.updatedAt !== null && updatedAt < state.updatedAt) {
      if (current === refreshing && finish(current)) {
        publish({locating:false}); scheduleNext(current.startedAt);
        if (state.position) current.callbacks.splice(0).forEach(callback=>callback(state.position!));
      }
      return;
    }
    const japan = isInJapan(point);
    const firstFix = !current.hasFix;
    if (japan && current === pending) {
      if (current.deadline !== undefined) environment.cancel(current.deadline);
      current.deadline = undefined;
      current.hasFix = true;
    } else if (!finish(current)) return;
    if (!japan) {
      if (pending) finish(pending);
      if (refreshing) finish(refreshing);
    }
    clearExpiry();
    publish({position:point,country:japan ? 'japan' : 'outside',updatedAt,locating:false,message:''});
    expiry = environment.schedule(()=>{
      expiry = null;
      if (active && !disposed && state.updatedAt === updatedAt) publish({position:null,updatedAt:null});
    },Math.max(0,locationLifetime-Math.max(0,age)));
    if (firstFix || !japan) scheduleNext(current.startedAt);
    current.callbacks.splice(0).forEach(callback=>callback(point));
  }
  function request(onLocated?:(point:Coordinates)=>void) {
    if (disposed || !active) return;
    if (pending && !pending.hasFix) { if (onLocated) pending.callbacks.push(onLocated); return; }
    if (refreshing) { if (onLocated) refreshing.callbacks.push(onLocated); return; }
    clearPoll();
    const current:Pending = {startedAt:environment.now(),callbacks:onLocated ? [onLocated] : []};
    const ongoing = !!pending;
    if (ongoing) refreshing = current; else pending = current;
    publish({locating:true,message:state.position ? '' : '正在取得位置…'});
    // An app deadline also recovers from a browser that never calls back.
    current.deadline = environment.schedule(()=>fail(current,{code:3},true),locationTimeout);
    try {
      const locate = ongoing ? environment.refresh ?? environment.locate : environment.locate;
      const cancel = locate(sample=>success(current,sample),error=>fail(current,error));
      if (pending === current || refreshing === current) current.cancel = cancel; else cancel();
    } catch { fail(current,{code:2}); }
  }
  function pause() {
    if (!active || disposed) return;
    active = false;
    clearPoll(); clearExpiry();
    const requests = [pending,refreshing]; pending = null; refreshing = null;
    for (const current of requests) {
      if (current?.deadline !== undefined) environment.cancel(current.deadline);
      current?.cancel?.();
    }
    publish({...initialLocationState});
  }
  return {
    request,
    resume() { if (!disposed && !active) { active = true; request(); } },
    pause,
    dispose() { pause(); disposed = true; },
  };
}

import { createContext, useContext, type ReactNode } from 'react';
import { useGeolocation } from '../lib/useGeolocation';

const Context = createContext<ReturnType<typeof useGeolocation> | null>(null);
export function LocationProvider({children}:{children:ReactNode}) {
  const location = useGeolocation();
  return <Context.Provider value={location}>{children}</Context.Provider>;
}
export function useCurrentLocation() {
  const location = useContext(Context);
  if (!location) throw new Error('LocationProvider is required');
  return location;
}

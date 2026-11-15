import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useExchangeRate } from '../lib/useExchangeRate';

interface CurrencyInput {from:'JPY' | 'TWD';amount:string}
const Context = createContext<(ReturnType<typeof useExchangeRate> & {input:CurrencyInput;setInput:Dispatch<SetStateAction<CurrencyInput>>}) | null>(null);
export function ExchangeRateProvider({children}:{children:ReactNode}) {
  const exchange = useExchangeRate();
  const [input,setInput] = useState<CurrencyInput>({from:'JPY',amount:'1000'});
  return <Context.Provider value={{...exchange,input,setInput}}>{children}</Context.Provider>;
}
export function useCurrentExchangeRate() {
  const exchange = useContext(Context);
  if (!exchange) throw new Error('ExchangeRateProvider is required');
  return exchange;
}

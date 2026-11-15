import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { convertPrice, exchangeRateSource } from '../lib/exchangeRate';
import { useCurrentExchangeRate } from './ExchangeRateProvider';

export function CurrencyCard() {
  const {quote,loading,failed,refresh,input,setInput} = useCurrentExchangeRate();
  const converted = convertPrice(input.amount,input.from,quote?.rate ?? null);
  function change(from:'JPY' | 'TWD',amount:string) {
    const normalized = amount.normalize('NFKC').replace(/,/g,'');
    if (/^\d*(?:\.\d*)?$/.test(normalized)) setInput({from,amount:normalized});
  }
  return <article className="audio-card currency-card" aria-labelledby="currency-title">
    <header className="audio-card-heading"><span className="audio-card-icon"><ArrowLeftRight size={20} aria-hidden="true" /></span><h2 id="currency-title">日圓／台幣換算</h2><button type="button" className="currency-refresh" aria-label="更新匯率" disabled={loading} onClick={()=>void refresh()}><RefreshCw size={18} aria-hidden="true" /></button></header>
    <div className="currency-inputs">{(['JPY','TWD'] as const).map(currency=><label key={currency} htmlFor={`currency-${currency}`}><span>{currency === 'JPY' ? '日圓' : '台幣'}</span><span className="currency-amount"><span aria-hidden="true">{currency === 'JPY' ? '¥' : 'NT$'}</span><input id={`currency-${currency}`} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={input.from === currency ? input.amount : converted} placeholder="—" onChange={event=>change(currency,event.target.value)} aria-label={currency === 'JPY' ? '日圓' : '台幣'} aria-describedby="currency-status" /></span></label>)}</div>
    <p className="currency-rate" id="currency-status" role="status">{quote ? <><span>{failed ? '上次匯率' : '參考匯率'} · {quote.date.replaceAll('-','/')}<span className="currency-equation">1 日圓 = NT$ {quote.rate.toFixed(4)}</span></span><a href={exchangeRateSource} target="_blank" rel="noopener noreferrer" aria-label="匯率來源 Frankfurter">Frankfurter ↗</a></> : loading ? '匯率更新中…' : '暫時無法更新匯率'}</p>
  </article>;
}

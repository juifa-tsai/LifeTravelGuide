export const exchangeRateUrl = 'https://api.frankfurter.dev/v2/rates?base=JPY&quotes=TWD';
export const exchangeRateSource = 'https://frankfurter.dev/';
export const exchangeRateKey = 'nagoya:jpy-twd-rate';
export interface ExchangeQuote {rate:number;date:string;fetchedAt:number}
const validDate = (date:unknown):date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
const validRate = (rate:unknown):rate is number => typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
export function parseExchangeQuote(value:unknown):ExchangeQuote | null {
  if (!value || typeof value !== 'object') return null;
  const q = value as Partial<ExchangeQuote>;
  return validRate(q.rate) && validDate(q.date) && typeof q.fetchedAt === 'number' && Number.isFinite(q.fetchedAt) && q.fetchedAt >= 0
    ? {rate:q.rate,date:q.date,fetchedAt:q.fetchedAt} : null;
}
export function readExchangeQuote():ExchangeQuote | null {
  try { return parseExchangeQuote(JSON.parse(localStorage.getItem(exchangeRateKey) || 'null')); } catch { return null; }
}
export function saveExchangeQuote(quote:ExchangeQuote) {
  try { localStorage.setItem(exchangeRateKey,JSON.stringify(quote)); } catch { /* Keep the in-memory quote. */ }
}
export async function fetchExchangeQuote(signal:AbortSignal,request:typeof fetch = fetch,now = Date.now):Promise<ExchangeQuote> {
  const response = await request(exchangeRateUrl,{signal,cache:'no-store'});
  if (!response.ok) throw new Error('Exchange rate unavailable');
  const rows:unknown = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Invalid exchange rate');
  const row = rows[0];
  if (!row || row.base !== 'JPY' || row.quote !== 'TWD') throw new Error('Incorrect currency pair');
  const quote = parseExchangeQuote({rate:row.rate,date:row.date,fetchedAt:now()});
  if (!quote) throw new Error('Invalid exchange rate');
  return quote;
}
export function convertPrice(amount:string,from:'JPY' | 'TWD',rate:number | null):string {
  const value = Number(amount);
  if (!amount.trim() || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount) || !Number.isFinite(value) || value < 0 || !validRate(rate)) return '';
  const converted = from === 'JPY' ? value*rate : value/rate;
  return Number.isFinite(converted) ? String(Math.round((converted+Number.EPSILON)*100)/100) : '';
}

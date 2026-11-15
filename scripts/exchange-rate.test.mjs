import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/lib/exchangeRate.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseExchangeQuote,fetchExchangeQuote,convertPrice,readExchangeQuote,saveExchangeQuote,exchangeRateKey,exchangeRateUrl}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const quote={rate:0.20597,date:'2026-11-15',fetchedAt:1794701000000};
test('JPY/TWD uses one consistent quote for both directions with two-decimal rounding',()=>{
 assert.equal(convertPrice('1000','JPY',quote.rate),'205.97');assert.equal(convertPrice('205.97','TWD',quote.rate),'1000');
 assert.equal(convertPrice('1','TWD',quote.rate),'4.86');assert.equal(convertPrice('0','JPY',quote.rate),'0');assert.equal(convertPrice('.5','JPY',quote.rate),'0.1');
 for(const amount of ['',' ','-100','1e4','NaN','Infinity','100 yen','1..2'])assert.equal(convertPrice(amount,'JPY',quote.rate),'');
 for(const rate of [null,0,-1,NaN,Infinity])assert.equal(convertPrice('1000','JPY',rate),'');
});
test('only valid dated numeric quotes can be restored from local cache',()=>{
 assert.deepEqual(parseExchangeQuote(quote),quote);
 for(const value of [null,[],{...quote,rate:0},{...quote,rate:'0.2'},{...quote,rate:Infinity},{...quote,date:'2026-02-30'},{...quote,date:'today'},{...quote,fetchedAt:NaN}])assert.equal(parseExchangeQuote(value),null);
});
test('fresh fetch validates JPY/TWD, checks HTTP errors and never sends entered amounts',async()=>{
 const controller=new AbortController();let captured;
 const request=async(url,options)=>{captured={url,options};return {ok:true,json:async()=>[{base:'JPY',quote:'TWD',date:quote.date,rate:quote.rate}]};};
 assert.deepEqual(await fetchExchangeQuote(controller.signal,request,()=>quote.fetchedAt),quote);
 assert.equal(captured.url,exchangeRateUrl);assert.equal(captured.options.signal,controller.signal);assert.equal(captured.options.cache,'no-store');assert.equal(captured.options.body,undefined);
 for(const rows of [[],[{base:'TWD',quote:'JPY',rate:5,date:quote.date}],[{base:'JPY',quote:'TWD',rate:0,date:quote.date}],[{base:'JPY',quote:'TWD',rate:.2,date:'2026-02-30'}]])await assert.rejects(fetchExchangeQuote(controller.signal,async()=>({ok:true,json:async()=>rows})));
 await assert.rejects(fetchExchangeQuote(controller.signal,async()=>({ok:false})));
 await assert.rejects(fetchExchangeQuote(controller.signal,async()=>{throw new DOMException('Aborted','AbortError');}));
});
test('cache failures leave the in-memory quote usable and never touch booking or GPS keys',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;});
 const entries=new Map([['nagoya:booking-details','private booking'],['nagoya:todo-items','personal todo']]);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)}});
 saveExchangeQuote(quote);assert.deepEqual(readExchangeQuote(),quote);assert.equal(entries.get('nagoya:booking-details'),'private booking');assert.equal(entries.get('nagoya:todo-items'),'personal todo');assert.equal(entries.size,3);
 entries.set(exchangeRateKey,'not JSON');assert.equal(readExchangeQuote(),null);
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw new Error('Blocked');},setItem(){throw new Error('Full');}}});
 assert.equal(readExchangeQuote(),null);assert.doesNotThrow(()=>saveExchangeQuote(quote));assert.equal(convertPrice('1000','JPY',quote.rate),'205.97');
});

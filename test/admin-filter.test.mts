import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { adminFilterCode } from '../src/admin-filter-script.ts';

class ElementMock {
  value = ''; textContent = ''; action = 'https://example.test/admin/links'; children: unknown[] = []; attrs = new Map<string,string>();
  listeners = new Map<string, (()=>void)[]>(); selectors = new Map<string,ElementMock>();
  querySelector(s:string) { return this.selectors.get(s) ?? null; }
  addEventListener(s:string, fn:()=>void) { this.listeners.set(s,[...(this.listeners.get(s) ?? []),fn]); }
  trigger(s:string) { for (const fn of this.listeners.get(s) ?? []) fn(); }
  setAttribute(k:string,v:string) { this.attrs.set(k,v); }
  removeAttribute(k:string) { this.attrs.delete(k); }
  replaceChildren(...nodes:unknown[]) { this.children=nodes; }
}
function fixture() {
 const form=new ElementMock(),query=new ElementMock(),state=new ElementMock(),results=new ElementMock(),status=new ElementMock(),win=new ElementMock();
 form.selectors.set('#q',query);form.selectors.set('#state',state);state.value='all';
 const map=new Map([['form[data-admin-filter]',form],['[data-admin-results]',results],['[data-admin-filter-status]',status]]);
 let timer:(()=>void)|null=null; let lastUrl='';
 const requests:{url:string,resolve:(r:unknown)=>void,signal:AbortSignal}[]=[];
 class FakeFormData { constructor(_form:unknown) { return [['q',query.value],['state',state.value]] as any; } }
 class Parser { parseFromString(text:string) {return {querySelector(){return text === 'missing' ? null : {childNodes:[text]};}};} }
 const document={querySelector(s:string){return map.get(s)??null;},importNode(node:unknown){return node;}};
 const history={replaceState(_s:unknown,_t:unknown,url:string){lastUrl=url;}};
 runInNewContext(adminFilterCode,{document,window:win,history,location:{href:'https://example.test/admin/links'},URL,URLSearchParams,AbortController,DOMParser:Parser,FormData:FakeFormData,
  setTimeout(fn:()=>void){timer=fn;return 1;},clearTimeout(){timer=null;},fetch(url:URL,options:{signal:AbortSignal}) {return new Promise(resolve=>requests.push({url:url.toString(),resolve,signal:options.signal}));}});
 return {form,query,state,results,status,requests,run(){assert(timer);const f=timer;timer=null;f();},url(){return lastUrl;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('入力と状態をサーバに送り、遅い古い応答は破棄する',async()=>{
 const p=fixture();p.query.value='cat';p.query.trigger('input');p.run();assert.match(p.requests[0].url,/q=cat&state=all/);
 p.query.value='犬';p.query.trigger('input');assert.equal(p.requests[0].signal.aborted,true);p.state.value='paused';p.state.trigger('change');p.run();
 assert.match(decodeURIComponent(p.requests[1].url),/q=犬&state=paused/);
 p.requests[1].resolve({ok:true,redirected:false,text:async()=> 'new'});await flush();assert.deepEqual(p.results.children,['new']);assert.match(decodeURIComponent(p.url()),/q=犬&state=paused/);
 p.requests[0].resolve({ok:true,redirected:false,text:async()=> 'old'});await flush();assert.deepEqual(p.results.children,['new']);assert(!p.results.attrs.has('aria-busy'));
});
test('IME変換中は送信せず、失敗時は既存結果と手動ボタンを維持',async()=>{
 const p=fixture();p.query.trigger('compositionstart');p.query.value='仮';p.query.trigger('input');assert.equal(p.requests.length,0);p.query.trigger('compositionend');p.run();assert.equal(p.requests.length,1);
 p.results.children=['original'];p.requests[0].resolve({ok:false,redirected:false});await flush();assert.deepEqual(p.results.children,['original']);assert.match(p.status.textContent,/ボタン/);assert.equal(p.url(),'');
});

import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createStateCode } from "../src/create-state-script.ts";
class ElementMock {
 one=new Map<string,ElementMock>();lists=new Map<string,ElementMock[]>();listeners=new Map<string,(()=>void)[]>();classes=new Set<string>();textContent="initial";
 classList={toggle:(name:string,on:boolean)=>on?this.classes.add(name):this.classes.delete(name)};
 querySelector(selector:string){return this.one.get(selector)??null;}querySelectorAll(selector:string){return this.lists.get(selector)??[];}
 addEventListener(type:string,callback:()=>void){const list=this.listeners.get(type)??[];list.push(callback);this.listeners.set(type,list);}emit(type:string){for(const fn of this.listeners.get(type)??[])fn();}
}
class InputMock extends ElementMock { value="";checked=false;validity="";setCustomValidity(value:string){this.validity=value;} }
class TextareaMock extends InputMock {}
class ButtonMock extends ElementMock { disabled=false; }
class FormMock extends ElementMock {fields=new Map<string,ElementMock>();elements={namedItem:(name:string)=>this.fields.get(name)??null};}
function page(turnstile:boolean,lang="en"){
 const studio=new ElementMock(),form=new FormMock(),message=new ElementMock(),submit=new ButtonMock(),target=new InputMock(),audience=new InputMock(),label=new InputMock(),slug=new InputMock(),timers:(()=>void)[]=[],window:Record<string,()=>void>={};
 studio.one.set("form.create-form",form);studio.one.set("#audience_enabled",audience);form.one.set("[data-create-validation]",message);form.one.set("[data-create-submit]",submit);if(turnstile)form.one.set(".cf-turnstile",new ElementMock());form.fields.set("target_url",target);form.fields.set("entry_label",label);form.fields.set("entry_slug",slug);form.lists.set("input,textarea,select",[target,label,slug]);const document={documentElement:{lang},querySelector(selector:string){assert.equal(selector,".create-studio");return studio;}};
 return {studio,form,message,submit,target,audience,label,slug,timers,window,document,start(){runInNewContext(createStateCode,{document,window,HTMLElement:ElementMock,HTMLFormElement:FormMock,HTMLInputElement:InputMock,HTMLTextAreaElement:TextareaMock,HTMLButtonElement:ButtonMock,setTimeout(fn:()=>void,delay:number){assert.equal(delay,0);timers.push(fn);}});},tick(){const fn=timers.shift();assert(fn);fn();}};
}
test("初回timer前はcallbackもDOM表示も変更しない",()=>{const p=page(false);p.start();assert.equal(p.message.textContent,"initial");assert.deepEqual(Object.keys(p.window),[]);assert.equal(p.timers.length,1);});
test("URL入力の既存判定とTurnstile有無で準備状態を決める",()=>{for(const turnstile of [false,true])for(const value of ["","https://example.com"," http://example.com ","ftp://example.com"]){const p=page(turnstile);p.target.value=value;p.start();p.tick();const valid=/^https?:\/\//i.test(value.trim());assert.equal(p.submit.disabled,!valid||turnstile);assert.equal(p.message.classes.has("is-valid"),valid&&!turnstile);}});
test("success expired error callbackはverified状態と表示を同期する",()=>{const p=page(true);p.target.value="https://example.com";p.start();p.tick();assert.equal(p.message.textContent,"Complete verification to create the link.");p.window.goTurnstileSuccess();assert.equal(p.message.textContent,"Ready to create.");assert.equal(p.submit.disabled,false);p.window.goTurnstileExpired();assert.equal(p.message.textContent,"Complete verification to create the link.");p.window.goTurnstileError();assert.equal(p.message.textContent,"Verification could not load. Try again.");p.window.goTurnstileSuccess();assert.equal(p.message.textContent,"Ready to create.");});
test("input changeは即時変更せず各timerの現在言語で同期する",()=>{const p=page(false);p.start();p.tick();p.target.value="https://example.com";p.target.emit("input");p.target.emit("change");assert.equal(p.submit.disabled,true);assert.equal(p.timers.length,2);p.document.documentElement.lang="ja";p.tick();assert.equal(p.message.textContent,"作成できます");p.target.value="bad";p.tick();assert.equal(p.message.textContent,"転送先URLを入力してください");});
test("audience有効のsubmitだけ現在言語のlabel slug validityを設定する",()=>{const p=page(false,"ja");p.start();p.tick();p.label.validity="previous";p.form.emit("submit");assert.equal(p.label.validity,"previous");p.audience.checked=true;p.label.value="label";p.form.emit("submit");assert.equal(p.label.validity,"");assert.equal(p.slug.validity,"入口ラベルと短縮パスを入力してください。");p.document.documentElement.lang="en";p.label.value=" ";p.slug.value="slug";p.form.emit("submit");assert.equal(p.label.validity,"Enter an entry label and short path.");assert.equal(p.slug.validity,"");});
test("studioまたはformが要素種不適合なら登録を止める",()=>{const p=page(false);p.studio.one.set("form.create-form",new ElementMock());p.start();p.tick();assert.deepEqual(Object.keys(p.window),[]);assert.equal(p.message.textContent,"initial");assert.equal(p.form.listeners.size,0);});

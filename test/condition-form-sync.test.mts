import assert from "node:assert/strict";
import test from "node:test";
import {runInNewContext} from "node:vm";
import {conditionFormSyncCode} from "../src/condition-form-sync-script.ts";
class ElementMock {
  one=new Map<string,ElementMock>(); lists=new Map<string,ElementMock[]>(); listeners=new Map<string,(()=>void)[]>(); textContent="initial"; hidden=false; removed=false;
  querySelector(selector:string){return this.one.get(selector)??null;} querySelectorAll(selector:string){return this.lists.get(selector)??[];}
  addEventListener(type:string,callback:()=>void){const a=this.listeners.get(type)??[];a.push(callback);this.listeners.set(type,a);}emit(type:string){for(const fn of this.listeners.get(type)??[])fn();}remove(){this.removed=true;}
}
class InputMock extends ElementMock{checked=false;name="";value="";}
class TextareaMock extends ElementMock{value="";}
class FieldsetMock extends ElementMock{disabled=false;}
class FormMock extends ElementMock{fields=new Map<string,ElementMock>();elements={namedItem:(name:string)=>this.fields.get(name)??null};}
function page(){
 const studio=new ElementMock(),form=new FormMock(),period=new InputMock(),limit=new InputMock(),schedule=new InputMock(),preview=new InputMock(),expiryText=new ElementMock(),limitText=new ElementMock(),scheduleText=new ElementMock(),target=new InputMock(),at=new InputMock(),parent=new FieldsetMock(),entry=new FieldsetMock(),parentNotice=new ElementMock(),entryNotice=new ElementMock(),microtasks:(()=>void)[]=[];
 studio.one.set("form.create-form",form);for(const [id,input]of [["#period_enabled",period],["#limit_enabled",limit],["#schedule_enabled",schedule],["#preview_enabled",preview]]as const)studio.one.set(id,input);
 for(const [selector,element]of [["[data-rule-expiry]",expiryText],["[data-rule-limit]",limitText],["[data-rule-schedule]",scheduleText]]as const)studio.lists.set(selector,[element]);
 studio.lists.set("fieldset[data-og-settings]",[parent,entry]);parent.one.set('input[name="preview_mode"]',new InputMock());parent.one.set("[data-og-disabled-notice]",parentNotice);entry.one.set("[data-og-disabled-notice]",entryNotice);form.fields.set("scheduled_target_url",target);form.fields.set("switch_at",at);
 studio.lists.set("[data-condition-toggle],#unlock_at,#expires_at,#max_open_count,#limit_reached_action,#limit_reached_target_url,#scheduled_target_url,#switch_at,#passphrase",[period,limit,schedule,preview,target,at]);
 const document={querySelector(selector:string){assert.equal(selector,".create-studio");return studio;}};
 return{studio,form,period,limit,schedule,preview,expiryText,limitText,scheduleText,target,at,parent,entry,parentNotice,entryNotice,microtasks,start(){runInNewContext(conditionFormSyncCode,{document,HTMLElement:ElementMock,HTMLFormElement:FormMock,HTMLInputElement:InputMock,HTMLTextAreaElement:TextareaMock,HTMLFieldSetElement:FieldsetMock,queueMicrotask(fn:()=>void){microtasks.push(fn);}});},tick(){const fn=microtasks.shift();assert(fn);fn();}};
}
test("無効条件だけ既存日本語の未設定表示へ戻す",()=>{const p=page();p.period.checked=true;p.start();assert.equal(p.expiryText.textContent,"initial");assert.equal(p.limitText.textContent,"設定なし");assert.equal(p.scheduleText.textContent,"設定なし");p.period.checked=false;p.period.emit("change");assert.equal(p.expiryText.textContent,"設定なし → 終了");});
test("切替の両値とpreviewに応じて親と入口fieldsetを同期する",()=>{for(const schedule of [false,true])for(const preview of [false,true])for(const url of [""," https://example.com "])for(const at of ["","2026-10-11"]){const p=page();p.schedule.checked=schedule;p.preview.checked=preview;p.target.value=url;p.at.value=at;p.start();const active=schedule&&Boolean(url.trim()&&at.trim());assert.equal(p.parent.disabled,active||!preview);assert.equal(p.entry.disabled,active);assert.equal(p.parentNotice.hidden,!active);assert.equal(p.entryNotice.hidden,!active);}});
test("input change conditioncardsyncで直ちに現在値を反映する",()=>{const p=page();p.start();p.preview.checked=true;p.preview.emit("input");assert.equal(p.parent.disabled,false);p.schedule.checked=true;p.target.value="https://x";p.at.value="date";p.form.emit("conditioncardsync");assert(p.entry.disabled);p.at.value="";p.at.emit("change");assert.equal(p.entry.disabled,false);});
test("submit listenerはmicrotask後に登録し無効日時と同名hiddenだけ除去する",()=>{const p=page(),date=new InputMock(),same=new InputMock(),other=new InputMock(),notInput=new ElementMock();date.name="unlock_at";same.name="unlock_at";other.name="expires_at";p.form.lists.set("input[data-local-datetime][disabled]",[date]);p.form.lists.set("input[type=hidden]",[same,other,notInput]);p.start();assert.equal(p.form.listeners.has("submit"),false);p.form.emit("submit");assert.equal(same.removed,false);p.tick();p.form.emit("submit");assert(same.removed);assert.equal(other.removed,false);assert.equal(notInput.removed,false);});
test("textareaの値はtrimし他要素のnamedItemは空値として扱う",()=>{const p=page(),area=new TextareaMock();p.schedule.checked=true;area.value=" https://x ";p.form.fields.set("scheduled_target_url",area);p.at.value="date";p.start();assert(p.entry.disabled);p.form.fields.set("scheduled_target_url",new ElementMock());p.form.emit("conditioncardsync");assert.equal(p.entry.disabled,false);});
test("form型が違うと初回同期もlistener登録もしない",()=>{const p=page();p.studio.one.set("form.create-form",new ElementMock());p.start();assert.equal(p.expiryText.textContent,"initial");assert.deepEqual(p.microtasks,[]);assert.equal(p.period.listeners.size,0);});

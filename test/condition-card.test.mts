import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { conditionCardCode } from "../src/condition-card-script.ts";

class ElementMock {
  hidden=false;
  parentElement: ElementMock | null=null;
  lists=new Map<string, ElementMock[]>();
  one=new Map<string, ElementMock>();
  listeners=new Map<string, ((event: Event) => void)[]>();
  classes=new Set<string>();
  classList={ toggle:(name:string,on:boolean)=>on?this.classes.add(name):this.classes.delete(name) };
  kind="";
  scrolled: string[]=[];
  events: string[]=[];
  details: DetailsMock | null=null;
  querySelector(selector:string){ return this.one.get(selector)??null; }
  querySelectorAll(selector:string){ return this.lists.get(selector)??[]; }
  closest(selector:string){ assert.equal(selector,"details.create-details");return this.details; }
  contains(target:ElementMock){ return [...this.lists.values()].some(list=>list.includes(target)); }
  getAttribute(name:string){ assert.equal(name,"data-condition-card");return this.kind; }
  scrollIntoView(options:{block:string}){ this.scrolled.push(options.block); }
  addEventListener(name:string,callback:(event:Event)=>void){ const list=this.listeners.get(name)??[];list.push(callback);this.listeners.set(name,list); }
  dispatchEvent(event:Event){ this.events.push(event.type);for(const callback of this.listeners.get(event.type)??[])callback(event);return !event.defaultPrevented; }
}
class InputMock extends ElementMock { checked=false;disabled=false;required=false;value="";validity="";setCustomValidity(value:string){this.validity=value;} }
class SelectMock extends InputMock {}
class TextareaMock extends InputMock {}
class DetailsMock extends ElementMock { open=false; }
class FormMock extends ElementMock { valid=true;reports=0;checks=0;checkValidity(){this.checks++;return this.valid;}reportValidity(){this.reports++;return this.valid;} }
function page(){
 const studio=new ElementMock(),form=new FormMock(),frames:(()=>void)[]=[],window=new ElementMock(),location={hash:""},ids=new Map<string,ElementMock>();
 studio.one.set("form.create-form",form);
 const cards:ElementMock[]=[];studio.lists.set("[data-condition-card]",cards);
 function card(kind:string){const card=new ElementMock(),toggle=new InputMock(),body=new ElementMock(),controls=[new InputMock(),new SelectMock(),new TextareaMock()];card.kind=kind;card.one.set("[data-condition-toggle]",toggle);card.one.set("[data-condition-body]",body);body.lists.set("input,select,textarea",[toggle,...controls]);cards.push(card);ids.set("create-condition-"+kind,card);return {card,toggle,body,controls};}
 const document={querySelector(selector:string){assert.equal(selector,".create-studio");return studio;},getElementById(id:string){return ids.get(id)??null;}};
 return {studio,form,frames,window,location,ids,cards,card,start(){runInNewContext(conditionCardCode,{document,window,location,Event,HTMLElement:ElementMock,HTMLInputElement:InputMock,HTMLSelectElement:SelectMock,HTMLTextAreaElement:TextareaMock,HTMLDetailsElement:DetailsMock,HTMLFormElement:FormMock,requestAnimationFrame(fn:()=>void){frames.push(fn);}});},tick(){const fn=frames.shift();assert(fn);fn();}};
}
test("条件カードtoggleは表示と各種controlのdisabledを同期する",()=>{const p=page(),c=p.card("period");p.start();assert(c.body.hidden);assert(c.controls.every(x=>x.disabled));assert.equal(c.toggle.disabled,false);c.toggle.checked=true;c.toggle.dispatchEvent(new Event("change"));assert.equal(c.body.hidden,false);assert(c.controls.every(x=>!x.disabled));assert(c.card.classes.has("is-enabled"));assert.deepEqual(p.form.events,["conditioncardsync","conditioncardsync"]);});
test("上限転送actionはcheckedと組み合わせてfallbackを同期する",()=>{const p=page(),c=p.card("limit"),action=new SelectMock(),fields=new ElementMock(),toggle=new InputMock(),url=new InputMock();c.card.one.set("[data-limit-reached-action]",action);c.card.one.set("[data-limit-fallback-fields]",fields);c.card.one.set("#limit_reached_target_enabled",toggle);c.card.one.set("#limit_reached_target_url",url);action.value="redirect";p.start();assert(fields.hidden&&url.disabled&&!url.required&&!toggle.checked);c.toggle.checked=true;c.toggle.dispatchEvent(new Event("change"));assert(!fields.hidden&&!url.disabled&&url.required&&toggle.checked);action.value="end";action.dispatchEvent(new Event("change"));assert(fields.hidden&&url.disabled&&!url.required&&!toggle.checked);});
test("submitは期間2値のvalidityと他条件のrequiredを設定しinvalidを報告する",()=>{const p=page(),period=p.card("period"),start=new InputMock(),end=new InputMock();period.card.one.set("#unlock_at",start);period.card.one.set("#expires_at",end);period.toggle.checked=true;for(const [kind,selector]of [["limit","#max_open_count"],["schedule","#scheduled_target_url"],["schedule","#switch_at"],["protection","#passphrase"]]){const c=p.card(kind),field=new InputMock();c.toggle.checked=true;c.card.one.set(selector,field);}p.form.valid=false;p.start();const e=new Event("submit",{cancelable:true});p.form.dispatchEvent(e);assert.equal(start.validity,"開始日時または終了日時を入力してください。");assert.equal(end.validity,start.validity);assert(e.defaultPrevented);assert.equal(p.form.reports,1);for(const c of p.cards.slice(1))assert([...c.one.values()].some(x=>x instanceof InputMock&&x.required));start.value="2026-10-11";p.form.dispatchEvent(new Event("submit"));assert.equal(start.validity,"");assert.equal(end.validity,"");});
test("期間inputとchangeはcustomValidityを解除する",()=>{const p=page(),start=new InputMock(),end=new InputMock();p.form.lists.set("#unlock_at,#expires_at",[start,end]);p.start();start.validity="bad";end.validity="bad";start.dispatchEvent(new Event("input"));end.dispatchEvent(new Event("change"));assert.equal(start.validity,"");assert.equal(end.validity,"");});
test("hash対象の所属を確認しdetailsを展開してRAFでscrollする",()=>{const p=page(),c=p.card("period"),details=new DetailsMock();c.card.details=details;p.location.hash="#create-condition-period";p.start();assert(details.open);assert.deepEqual(c.card.scrolled,[]);p.tick();assert.deepEqual(c.card.scrolled,["start"]);p.location.hash="#unknown";p.window.dispatchEvent(new Event("hashchange"));assert.deepEqual(p.frames,[]);});
test("不正hashのdecode例外と対象なしの既存挙動を保持する",()=>{const p=page();p.start();assert.deepEqual(p.frames,[]);p.location.hash="#%";assert.throws(()=>p.window.dispatchEvent(new Event("hashchange")),{name:"URIError"});});

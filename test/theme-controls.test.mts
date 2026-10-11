import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { themeControlsCode } from "../src/theme-controls-script.ts";
class ElementMock {
  textContent: string | null = "";
  attributes = new Map<string,string>();
  listeners = new Map<string, (() => void)[]>();
  focused = 0;
  setAttribute(name: string, value: string) { this.attributes.set(name,value); }
  focus() { this.focused++; }
  addEventListener(name: string, fn: () => void) { this.listeners.set(name,[...this.listeners.get(name) ?? [], fn]); }
  fire(name: string) { for(const fn of this.listeners.get(name) ?? []) fn(); }
}
class InputMock extends ElementMock { value = ""; checked = false; }
class DetailsMock extends ElementMock { open = true; children = new Map<string, ElementMock>(); querySelector(s: string) { return this.children.get(s) ?? null; } }
function page(theme?: string, lang = "en", legacy = false) {
  const root = { dataset: { theme }, lang, style: { colorScheme: "" } }, menu = new DetailsMock(), summary = new ElementMock(), status = new ElementMock(), labels = new Map<string,ElementMock>(), radios = ["auto","light","dark"].map(value=>Object.assign(new InputMock(),{value})), system = {matches:false}, changes: (() => void)[] = [], stored = new Map<string,string>(), calls: string[] = [];
  menu.children.set("summary",summary);menu.children.set(".theme-status",status);for(const name of ["locale-label","theme-legend","theme-auto","theme-light","theme-dark"])labels.set('[data-'+name+']',new ElementMock());
  const document = { documentElement:root, querySelector(s:string) { return s === ".theme-menu" ? menu : labels.get(s) ?? null; }, querySelectorAll(s:string) { assert.equal(s,"input[name=go_theme]");return radios; } };
  return {root,menu,summary,status,labels,radios,system,changes,stored,calls,document,
    start(failStorage=false) { runInNewContext(themeControlsCode,{document,HTMLInputElement:InputMock,matchMedia(s:string){assert.equal(s,"(prefers-color-scheme: dark)");calls.push("media");return legacy ? {get matches(){return system.matches},addListener(fn:()=>void){changes.push(fn)}} : {get matches(){return system.matches},addEventListener(name:string,fn:()=>void){assert.equal(name,"change");changes.push(fn)}};},localStorage:{setItem(key:string,value:string){calls.push("set");if(failStorage)throw new Error("storage unavailable");stored.set(key,value);}}});},
    select(value:string) { for(const r of radios)r.checked=r.value===value;const r=radios.find(r=>r.value===value);assert(r);r.fire("change"); },
    changeSystem(dark:boolean) { system.matches=dark;for(const fn of changes)fn(); },
  };
}
test("未設定・不正themeはautoへ戻し現在OSを表示する",()=>{for(const theme of [undefined,"invalid",""]){const p=page(theme);p.start();assert.equal(p.root.dataset.theme,"auto");assert.equal(p.root.style.colorScheme,"light dark");assert.equal(p.status.textContent,"Current theme: Auto (Light)");assert(p.radios[0].checked);assert.equal(p.summary.attributes.get("aria-label"),"Choose theme");assert.equal(p.stored.size,0);}});
test("manual選択は保存・menu閉じ・summary focusを維持する",()=>{const p=page("auto");p.start();p.select("dark");assert.equal(p.root.dataset.theme,"dark");assert.equal(p.root.style.colorScheme,"dark");assert.equal(p.status.textContent,"Current theme: Dark");assert.equal(p.stored.get("go_theme"),"dark");assert.equal(p.menu.open,false);assert.equal(p.summary.focused,1);});
test("autoだけOS変更へ追従しlegacy listenerも維持する",()=>{for(const legacy of [false,true]){const p=page("auto","en",legacy);p.start();p.changeSystem(true);assert.equal(p.status.textContent,"Current theme: Auto (Dark)");p.select("light");p.changeSystem(false);assert.equal(p.status.textContent,"Current theme: Light");p.select("auto");p.changeSystem(true);assert.equal(p.status.textContent,"Current theme: Auto (Dark)");}});
test("同期時の言語を使いlabelと選択名を更新する",()=>{const p=page("auto","ja");p.start();assert.equal(p.status.textContent,"現在のテーマ: 自動 (ライト)");assert.equal(p.labels.get("[data-locale-label]")?.textContent,"言語");p.root.lang="en";p.changeSystem(true);assert.equal(p.labels.get("[data-locale-label]")?.textContent,"Language");assert.equal(p.status.textContent,"Current theme: Auto (Dark)");});
test("保存失敗も現在themeとmenuとfocusを更新する",()=>{const p=page();p.start(true);p.select("light");assert.equal(p.root.dataset.theme,"light");assert.equal(p.stored.size,0);assert.equal(p.menu.open,false);assert.equal(p.summary.focused,1);});
test("必要要素欠落時はmedia・保存・listenerへ触れない",()=>{for(const missing of ["menu","summary","status","radios"]){const p=page();if(missing==="menu")p.document.querySelector=()=>null;else if(missing==="summary")p.menu.children.delete("summary");else if(missing==="status")p.menu.children.delete(".theme-status");else p.radios.length=0;p.start();assert.deepEqual(p.calls,[]);assert.equal(p.changes.length,0);assert.equal(p.summary.focused,0);}});

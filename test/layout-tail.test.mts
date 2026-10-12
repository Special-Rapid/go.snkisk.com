import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { layoutTailCode } from "../src/layout-tail-script.ts";
class Element {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  listeners = new Map<string, (() => unknown)[]>();
  queries = new Map<string, Element>();
  parentElement: Element | null = null;
  textContent = "";
  innerHTML = "";
  className = "";
  hidden = false;
  disabled = false;
  classList = { add() {}, remove() {}, toggle() {} };
  get offsetWidth() { return 10; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  querySelector(name: string) { return this.queries.get(name) ?? null; }
  addEventListener(name: string, callback: () => unknown) { this.listeners.set(name, [...this.listeners.get(name) ?? [], callback]); }
  async fire(name: string) { for (const callback of this.listeners.get(name) ?? []) await callback(); }
}
class Input extends Element { value = ""; type = "password"; checked = false; }
class Button extends Element {}
function fixture(options: {lang?: string; clipboardFail?: boolean; payload?: unknown; responseOK?: boolean} = {}) {
  const copy = new Button(), label = new Element(), icon = new Element(), feedback = new Element(), parent = new Element();
  copy.dataset = {copy: "https://example.com", copyTarget: "短縮URL"};
  copy.queries.set("[data-copy-label]", label); copy.queries.set("[data-copy-icon]", icon);
  parent.queries.set("[data-copy-feedback]", feedback); copy.parentElement = parent;
  const eye = new Button(), passphrase = new Input(), slug = new Input(), slugOutput = new Element(), usage = new Element(), limit = new Element();
  eye.setAttribute("aria-controls", "passphrase"); slug.dataset.slugCheck = "#slug-output"; usage.dataset.usageUrl = "/usage";
  const lists = new Map<string, Element[]>([["[data-copy]", [copy]], ["[data-passphrase-toggle]", [eye]], ["[data-slug-check]", [slug]], ["[data-open-limit]", [limit]]]);
  const singles = new Map<string, Element>([["#slug-output", slugOutput], ["#usage_count", usage]]);
  const timeouts = new Map<number, () => unknown>(), intervals = new Map<number, () => unknown>(), events = new Map<string, () => unknown>();
  const copied: string[] = [], requests: string[] = [];
  let serial = 0; let payload: unknown = options.payload ?? {message: "空いています", available: true, usage: "3", limitUsage: "4"};
  const document = {documentElement: {lang: options.lang ?? "ja"}, hidden: false, querySelector: (s: string) => singles.get(s) ?? null, querySelectorAll: (s: string) => lists.get(s) ?? [], getElementById: (id: string) => id === "passphrase" ? passphrase : null, addEventListener: (name: string, callback: () => unknown) => events.set(name, callback)};
  const scope = {document, HTMLElement: Element, HTMLInputElement: Input, HTMLButtonElement: Button, HTMLFormElement: class {}, HTMLTextAreaElement: class {}, HTMLFieldSetElement: class {}, Intl, Date, URL, encodeURIComponent,
    navigator: {clipboard: {async writeText(value: string) { copied.push(value); if (options.clipboardFail) throw Error("clipboard unavailable"); }}},
    setTimeout(callback: () => unknown) { const id = ++serial; timeouts.set(id, callback); return id; }, clearTimeout(id: number) { timeouts.delete(id); },
    setInterval(callback: () => unknown) { const id = ++serial; intervals.set(id, callback); return id; }, clearInterval(id: number) { intervals.delete(id); },
    async fetch(url: string) { requests.push(url); return {ok: options.responseOK !== false, async json() { return payload; }}; }};
  runInNewContext(layoutTailCode, {...scope, window: scope});
  return {copy, label, icon, feedback, eye, passphrase, slug, slugOutput, usage, limit, copied, requests, timeouts, intervals, document,
    setPayload(value: unknown) { payload = value; }, async flushTimeouts() { for (const [id, callback] of [...timeouts]) { timeouts.delete(id); await callback(); } }, async visibility(hidden: boolean) { document.hidden = hidden; await events.get("visibilitychange")?.(); }};
}
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
test("コピー成功・連続操作・時間後の文言復元を維持する", async () => { const f = fixture(); await f.copy.fire("click"); await f.copy.fire("click"); assert.deepEqual(f.copied, ["https://example.com", "https://example.com"]); assert.equal(f.label.textContent, "コピーしました"); assert.equal(f.timeouts.size, 1); await f.flushTimeouts(); assert.equal(f.label.textContent, "コピー"); assert.equal(f.feedback.textContent, ""); });
test("コピー失敗は既存の失敗文言と復元を維持する", async () => { const f = fixture({lang: "en", clipboardFail: true}); await f.copy.fire("click"); assert.equal(f.feedback.textContent, "Copy failed"); assert.equal(f.label.textContent, "Copy Link"); await f.flushTimeouts(); assert.equal(f.feedback.textContent, ""); });
test("合言葉の表示切替と意味を持つaccessible labelを維持する", async () => { const f = fixture({lang: "en"}); assert.equal(f.eye.getAttribute("aria-label"), "Show passphrase"); await f.eye.fire("click"); assert.equal(f.passphrase.type, "text"); assert.equal(f.eye.getAttribute("aria-pressed"), "true"); assert.equal(f.eye.getAttribute("aria-label"), "Hide passphrase"); await f.eye.fire("click"); assert.equal(f.passphrase.type, "password"); });
test("slugのdebounce・正規化・JSON結果を維持する", async () => { const f = fixture(); await settle(); f.slug.value = " /first "; await f.slug.fire("input"); f.slug.value = " /次 "; await f.slug.fire("input"); assert.equal(f.timeouts.size, 1); await f.flushTimeouts(); assert.equal(f.requests.at(-1), "/api/slug-availability?slug=%E6%AC%A1"); assert.equal(f.slugOutput.textContent, "空いています"); assert.equal(f.slugOutput.className, "availability ok"); });
test("slugの空入力と不正JSONによる失敗を維持する", async () => { const f = fixture(); await settle(); f.slug.value = "x"; f.setPayload(null); await f.slug.fire("input"); await f.flushTimeouts(); assert.equal(f.slugOutput.textContent, "空き状況を確認できません"); f.slug.value = ""; await f.slug.fire("input"); assert.equal(f.slugOutput.textContent, ""); assert.equal(f.slugOutput.className, "availability"); });
test("usageの文字列だけの更新・非表示停止・再表示開始を維持する", async () => { const f = fixture(); await settle(); assert.equal(f.usage.textContent, "3"); assert.equal(f.limit.textContent, "4"); assert.equal(f.intervals.size, 1); await f.visibility(true); assert.equal(f.intervals.size, 0); f.setPayload({usage: 7, limitUsage: false}); await f.visibility(false); await settle(); assert.equal(f.usage.textContent, "3"); assert.equal(f.limit.textContent, "4"); assert.equal(f.intervals.size, 1); });
test("usage非OK結果は既存値を保持する", async () => { const f = fixture({responseOK: false}); await settle(); assert.equal(f.usage.textContent, ""); assert.equal(f.limit.textContent, ""); });

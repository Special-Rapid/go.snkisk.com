import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { localizationAfterCode } from "../src/localization-after-script.ts";

class ElementMock {
  tagName: string;
  parentElement: ElementMock | null = null;
  children: (ElementMock | TextMock)[] = [];
  textContent: string | null = "";
  listeners = new Map<string, (() => void)[]>();
  constructor(tagName = "DIV") { this.tagName = tagName; }
  addEventListener(name: string, fn: () => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], fn]); }
  emit(name: string) { for (const fn of this.listeners.get(name) ?? []) fn(); }
}
class TextMock {
  nodeValue: string | null;
  parentElement: ElementMock | null;
  constructor(value: string | null, parent: ElementMock | null) { this.nodeValue = value; this.parentElement = parent; parent?.children.push(this); }
}
function page(callbacks = true, host = "sinkaisoku.com") {
  const body = new ElementMock("BODY"), input = new ElementMock("INPUT"), zone = new ElementMock();
  const frames: (() => void)[] = [], timers: (() => void)[] = [], traces: string[] = [];
  const events = new ElementMock(), dictionary: Record<string, string> = {};
  const document = { documentElement: { lang: "en" }, body, title: "題名 - " + host,
    addEventListener(name: string, fn: () => void) { events.addEventListener(name, fn); },
    querySelectorAll(selector: string) { traces.push(selector); if (selector === "[data-time-zone-for]") return [zone]; assert.equal(selector, "input[data-local-datetime]"); return [input]; },
    createTreeWalker(root: ElementMock, filter: number) {
      assert.equal(root, body); assert.equal(filter, 4); traces.push("walk"); const nodes: TextMock[] = [];
      function collect(e: ElementMock) { for (const c of e.children) c instanceof TextMock ? nodes.push(c) : collect(c); }
      collect(root); let index = 0; return { currentNode: nodes[0], nextNode() { this.currentNode = nodes[index++]; return this.currentNode !== undefined; } };
    },
  };
  const window: { goRegisterTranslationWords?: (words: Record<string, string>) => void; goTranslateText?: (text: string) => string } = {};
  if (callbacks) {
    window.goRegisterTranslationWords = words => { traces.push("register"); Object.assign(dictionary, words); };
    window.goTranslateText = value => { traces.push("translate:" + value); const trimmed = value.trim(); const translated = document.documentElement.lang === "en" ? dictionary[trimmed] ?? (trimmed === "題名" ? "Title" : trimmed) : trimmed; return value.replace(trimmed, translated); };
  }
  return { body, input, zone, frames, timers, traces, document, window, dictionary, events,
    start() { runInNewContext(localizationAfterCode.replace("___GO_LOCALIZATION_AFTER_SERVICE_HOST___", host), { document, window, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { traces.push("raf"); frames.push(fn); }, setTimeout(fn: () => void) { traces.push("timer"); timers.push(fn); } }); },
    tick() { const fn = frames.shift(); assert(fn); fn(); }, flush() { while (timers.length) timers.shift()?.(); },
  };
}

test("補助辞書登録はRAFより先で、文言と空白とhost suffixを保持する", () => {
  for (const host of ["sinkaisoku.com", "go.snkisk.com"]) {
    const p = page(true, host), text = new TextMock(" 更新すると利用回数はリセットされます。\n", p.body); p.start(); assert.deepEqual(p.traces.slice(0, 2), ["register", "raf"]); assert.equal(p.frames.length, 1); assert.equal(text.nodeValue, " 更新すると利用回数はリセットされます。\n"); p.tick(); assert.equal(text.nodeValue, " Saving resets the usage count.\n"); assert.equal(p.document.title, "Title - " + host); assert.equal(Object.keys(p.dictionary).length, 19);
  }
});
test("callback未定義と空文字の翻訳結果は既存fallbackを維持する", () => {
  for (const empty of [false, true]) { const p = page(false), t = new TextMock("更新すると利用回数はリセットされます。", p.body); if (empty) p.window.goTranslateText = () => ""; p.start(); p.tick(); assert.equal(t.nodeValue, "更新すると利用回数はリセットされます。"); assert.equal(p.document.title, "題名 - sinkaisoku.com"); }
});
test("除外tag・孤立text・nullと空値を保持し通常textだけ翻訳する", () => {
  const p = page(); const texts = ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"].map(tag => { const parent = new ElementMock(tag); p.body.children.push(parent); return new TextMock("更新すると利用回数はリセットされます。", parent); });
  const orphan = new TextMock("更新すると利用回数はリセットされます。", null); p.body.children.push(orphan); const nullText = new TextMock(null, p.body), empty = new TextMock("", p.body); p.start(); p.tick(); for (const t of texts) assert.equal(t.nodeValue, "更新すると利用回数はリセットされます。"); assert.equal(orphan.nodeValue, "更新すると利用回数はリセットされます。"); assert.equal(nullText.nodeValue, null); assert.equal(empty.nodeValue, "");
});
test("RAFとlocale通知は実行時の言語を使い、日時zone表記を既存式で整える", () => {
  const p = page(); p.zone.textContent = "Times are shown and entered in your local time (Asia/Tokyo / GMT+09:00)."; p.start(); p.document.documentElement.lang = "ja"; p.tick(); assert.equal(p.zone.textContent, "入力・表示はお使いの端末の現地時間です（Asia/Tokyo / GMT+09:00）"); p.document.documentElement.lang = "en"; p.events.emit("go:localechange"); assert.equal(p.document.title, "Title - sinkaisoku.com");
});
test("inputとchangeはtimerに積み同期を急がず、locale通知は直接同期する", () => {
  const p = page(); p.start(); p.tick(); const t = new TextMock("更新すると利用回数はリセットされます。", p.body); p.input.emit("input"); p.input.emit("change"); assert.equal(p.timers.length, 2); assert.equal(t.nodeValue, "更新すると利用回数はリセットされます。"); p.flush(); assert.equal(t.nodeValue, "Saving resets the usage count."); t.nodeValue = "更新すると利用回数はリセットされます。"; p.events.emit("go:localechange"); assert.equal(t.nodeValue, "Saving resets the usage count.");
});
test("title不一致とzone不一致は保持し、登録callback例外はRAF前に伝播する", () => {
  const p = page(); p.document.title = "題名 - other.example"; p.zone.textContent = "unknown"; p.start(); p.tick(); assert.equal(p.document.title, "題名 - other.example"); assert.equal(p.zone.textContent, "unknown"); const failing = page(); failing.window.goRegisterTranslationWords = () => { throw new Error("registration failed"); }; assert.throws(() => failing.start(), /registration failed/); assert.equal(failing.frames.length, 0);
});

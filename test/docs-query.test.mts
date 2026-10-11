import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { docsQueryCode } from "../src/docs-query-script.ts";

class CopyElement {
  dataset: Record<string, string | undefined> = {};
  textContent: string | null = "original";
  constructor(key?: string) { if (key !== undefined) this.dataset.docsCopy = key; }
}
function page(lang = "ja", origin = "https://docs.sinkaisoku.com") {
  const elements = ["title", "lead", "back", "basics", "conditions", "example", "note", "openProtection", "availability", "limit", "schedule", "end", "preview", "audience", "query", "unknown", ""].map(key => new CopyElement(key)); elements.push(new CopyElement());
  const listeners = new Map<string, { fn: () => void; once: boolean }[]>(), traces: string[] = [];
  const document = { documentElement: { lang }, title: "original", querySelectorAll(selector: string) { assert.equal(selector, "[data-docs-copy]"); traces.push("query"); return elements; }, addEventListener(name: string, fn: () => void, options?: { once?: boolean }) { listeners.set(name, [...listeners.get(name) ?? [], { fn, once: options?.once ?? false }]); } };
  return { document, elements, listeners, traces,
    start() { runInNewContext(docsQueryCode.replace("___GO_DOCS_QUERY_ORIGIN___", () => origin), { document }); },
    emit(name: string) { const pending = listeners.get(name) ?? []; listeners.set(name, pending.filter(v => !v.once)); for (const { fn } of pending) fn(); },
  };
}

test("開始時は文言を変えずDOMContentLoadedをonceで登録する", () => { const p = page(); p.start(); assert.equal(p.document.title, "original"); assert.deepEqual(p.traces, []); assert.deepEqual([...p.listeners.keys()], ["go:localechange", "DOMContentLoaded"]); assert.equal(p.listeners.get("DOMContentLoaded")?.[0].once, true); p.emit("DOMContentLoaded"); assert.equal(p.elements[0].textContent, "クエリーで作成設定を入力する"); assert.equal(p.document.title, "クエリー設定 | https://docs.sinkaisoku.com"); const count = p.traces.length; p.emit("DOMContentLoaded"); assert.equal(p.traces.length, count); });
test("実行時enだけ英語を使いその他言語は日本語へfallbackする", () => { for (const lang of ["ja", "fr", "en-US", ""]) { const p = page(lang); p.start(); p.emit("go:localechange"); assert.equal(p.elements[0].textContent, "クエリーで作成設定を入力する"); } const p = page(); p.start(); p.document.documentElement.lang = "en"; p.emit("DOMContentLoaded"); assert.equal(p.elements[0].textContent, "Prefill creation settings with a query"); assert.equal(p.document.title, "Query settings | https://docs.sinkaisoku.com"); });
test("15辞書項目と未知・空・属性欠落を区別して同期する", () => { const p = page("en"); p.start(); p.emit("go:localechange"); assert.equal(p.elements.slice(0, 15).filter(e => e.textContent !== "original").length, 15); assert.deepEqual(p.elements.slice(15).map(e => e.textContent), ["original", "original", "original"]); assert.equal(p.elements[7].textContent, "Use protection_enabled=1 only to open the passphrase card, then type the passphrase directly on the creation page."); });
test("locale再通知は現在のdatasetを読むが入力操作やnavigationを追加しない", () => { const p = page(); p.start(); p.emit("DOMContentLoaded"); p.document.documentElement.lang = "en"; p.elements[0].dataset.docsCopy = "back"; p.emit("go:localechange"); assert.equal(p.elements[0].textContent, "Create a short link"); p.document.documentElement.lang = "ja"; p.emit("go:localechange"); assert.equal(p.elements[0].textContent, "短縮URLを作成する"); assert.deepEqual([...p.listeners.keys()], ["go:localechange", "DOMContentLoaded"]); });
test("host markerは両originとreplacement特殊文字をそのまま保つ", () => { for (const origin of ["https://docs.go.snkisk.com", "https://docs.sinkaisoku.com", "https://docs.$&amp;.example", "https://docs.example/&#39;&quot;"]) { const p = page("en", origin); p.start(); p.emit("go:localechange"); assert.equal(p.document.title, "Query settings | " + origin); } });
test("空DOMでもtitleを同期しquery例外は既存どおり伝播する", () => { const p = page(); p.elements.length = 0; p.start(); p.emit("DOMContentLoaded"); assert.equal(p.document.title, "クエリー設定 | https://docs.sinkaisoku.com"); const q = page(); q.document.querySelectorAll = () => { throw new Error("query failed"); }; q.start(); assert.throws(() => q.emit("go:localechange"), /query failed/); assert.equal(q.document.title, "original"); });

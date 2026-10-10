import assert from "node:assert/strict";
import test from "node:test";
import { createContext, runInContext } from "node:vm";
import { createServiceGuideLocaleScript } from "../src/create-service-guide-locale-script.ts";

function page(lang: string, keys: (string | undefined)[] = ["title", "docs", "extension"]) {
  const events: { name: string; listener: () => void; once: boolean }[] = [];
  const elements = keys.map(key => ({ dataset: { serviceGuide: key }, textContent: "元の表示" }));
  let queries = 0;
  const document = {
    documentElement: { lang },
    addEventListener(name: string, listener: () => void, options?: { once?: boolean }) {
      events.push({ name, listener, once: options?.once === true });
    },
    querySelectorAll(selector: string) {
      assert.equal(selector, "[data-service-guide]");
      queries++;
      return elements;
    },
  };
  runInContext(createServiceGuideLocaleScript, createContext({ document }));
  return { document, elements, events, queries: () => queries,
    dispatch(name: string) {
      for (const event of [...events]) {
        if (event.name !== name) continue;
        event.listener();
        if (event.once) events.splice(events.indexOf(event), 1);
      }
    },
  };
}

test("案内はイベントまで変更せず、localechangeと一度だけのDOMContentLoadedを登録する", () => {
  const view = page("ja");
  assert.deepEqual(view.events.map(({ name, once }) => ({ name, once })), [
    { name: "go:localechange", once: false }, { name: "DOMContentLoaded", once: true },
  ]);
  assert.equal(view.queries(), 0);
  assert(view.elements.every(element => element.textContent === "元の表示"));
  view.dispatch("DOMContentLoaded");
  view.dispatch("DOMContentLoaded");
  assert.equal(view.queries(), 1);
});

test("イベント時点の英語で3文言を同期し、その後の日本語切替も反映する", () => {
  const view = page("ja");
  view.document.documentElement.lang = "en";
  view.dispatch("go:localechange");
  assert.deepEqual(view.elements.map(e => e.textContent), [
    "Query settings and extension", "Learn how to prefill settings with a query",
    "Chrome extension download URL: In development",
  ]);
  view.document.documentElement.lang = "ja";
  view.dispatch("DOMContentLoaded");
  assert.deepEqual(view.elements.map(e => e.textContent), [
    "クエリー設定と拡張機能", "クエリーで設定を入力する方法を見る",
    "Chrome拡張機能のダウンロードURL：開発中",
  ]);
  view.document.documentElement.lang = "en";
  view.dispatch("go:localechange");
  assert.equal(view.elements[0].textContent, "Query settings and extension");
});

test("en以外は日本語へ戻し、複数の同じkeyを同期する", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) {
    const view = page(lang, ["title", "title"]);
    view.dispatch("go:localechange");
    assert.deepEqual(view.elements.map(e => e.textContent), ["クエリー設定と拡張機能", "クエリー設定と拡張機能"]);
  }
});

test("未知・欠落・空keyと対象なしを安全に通過する", () => {
  const view = page("en", ["unknown", undefined, ""]);
  view.dispatch("DOMContentLoaded");
  assert(view.elements.every(element => element.textContent === "元の表示"));
  const empty = page("en", []);
  empty.dispatch("go:localechange");
  assert.deepEqual(empty.elements, []);
});

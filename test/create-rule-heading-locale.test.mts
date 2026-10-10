import assert from "node:assert/strict";
import test from "node:test";
import { createContext, runInContext } from "node:vm";
import { createRuleHeadingLocaleCode } from "../src/create-rule-heading-locale-script.ts";

function page(lang: string, texts: (string | null)[] = ["動作を変える条件", "有効期限", "未知", "", null], counts: (string | null)[] = ["現在 2回", "12回", null]) {
  const timers: (() => void)[] = [];
  const elements = texts.map(textContent => ({ textContent }));
  const countElements = counts.map(textContent => ({ textContent }));
  const listeners: { name: string; listener: () => void }[] = [];
  const input = { addEventListener(name: string, listener: () => void) { listeners.push({ name, listener }); } };
  const document = {
    documentElement: { lang },
    querySelectorAll(selector: string) {
      if (selector === ".rule-conditions h3,.rule-conditions>p,.rule-conditions strong,.create-form option") return elements;
      if (selector === "[data-rule-limit-count]") return countElements;
      assert.equal(selector, ".create-form input,.create-form select,.create-form textarea");
      return [input];
    },
  };
  runInContext(createRuleHeadingLocaleCode, createContext({ document, setTimeout(callback: () => void, delay: number) { assert.equal(delay, 0); timers.push(callback); } }));
  return { document, elements, countElements, listeners, timers,
    tick() { const callback = timers.shift(); assert(callback); callback(); },
    dispatch(name: string) { for (const event of listeners) if (event.name === name) event.listener(); },
  };
}

test("見出し翻訳は遅延実行時のlangがenのときだけ始まる", () => {
  const view = page("ja");
  assert.equal(view.timers.length, 1);
  assert.equal(view.elements[0].textContent, "動作を変える条件");
  view.document.documentElement.lang = "en";
  view.tick();
  assert.deepEqual(view.elements.map(e => e.textContent), ["Conditions that change behavior", "Expiration", "未知", "", null]);
  assert.deepEqual(view.countElements.map(e => e.textContent), ["Current 2 visits", "12 visits", ""]);
  assert.deepEqual(view.listeners.map(e => e.name), ["input", "change"]);
});

test("en以外で初回timerが終わると後続イベントの翻訳を登録しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) {
    const view = page(lang);
    view.tick();
    view.document.documentElement.lang = "en";
    view.dispatch("input");
    assert.equal(view.timers.length, 0);
    assert.deepEqual(view.listeners, []);
    assert.equal(view.elements[0].textContent, "動作を変える条件");
  }
});

test("inputとchangeは即時変更せず各timerで再翻訳し、後続langは再判定しない", () => {
  const view = page("en");
  view.tick();
  view.document.documentElement.lang = "ja";
  view.elements[0].textContent = "回数制限";
  view.countElements[0].textContent = "現在 7回";
  view.dispatch("input");
  view.dispatch("change");
  assert.equal(view.elements[0].textContent, "回数制限");
  assert.equal(view.timers.length, 2);
  view.tick();
  assert.equal(view.elements[0].textContent, "Open limit");
  assert.equal(view.countElements[0].textContent, "Current 7 visits");
  view.elements[0].textContent = "リンクを終了";
  view.tick();
  assert.equal(view.elements[0].textContent, "End the link");
});

test("既知8文言・複数同文言・countの境界と対象なしを維持する", () => {
  const view = page("en", ["動作を変える条件", "条件が一致した場合だけ、上から順に優先されます。", "有効期限", "利用開始・合言葉", "回数制限", "日時による切替", "リンクを終了", "別のURLへ転送", "有効期限"], ["現在 0回", "現在 2回残り", "先頭現在 3回", ""]);
  view.tick();
  assert.deepEqual(view.elements.map(e => e.textContent), ["Conditions that change behavior", "Matching conditions take priority in this order.", "Expiration", "Availability and passphrase", "Open limit", "Scheduled switch", "End the link", "Redirect to another URL", "Expiration"]);
  assert.deepEqual(view.countElements.map(e => e.textContent), ["Current 0 visits", "Current 2回残り", "先頭現在 3 visits", ""]);
  const empty = page("en", [], []);
  empty.tick();
  empty.dispatch("change");
  empty.tick();
  assert.deepEqual(empty.elements, []);
});

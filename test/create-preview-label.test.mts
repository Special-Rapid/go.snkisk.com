import assert from "node:assert/strict";
import test from "node:test";
import { createContext, runInContext } from "node:vm";
import { createPreviewLabelScript } from "../src/create-preview-label-script.ts";

function page(lang: string, count = 1, foreign = false) {
  const labels: { name: string; value: string }[] = [];
  const selectors: string[] = [];
  const events: { name: string; listener: () => void }[] = [];
  class Fieldset {
    setAttribute(name: string, value: string) { labels.push({ name, value }); }
  }
  const elements: object[] = Array.from({ length: count }, () => new Fieldset());
  if (foreign) elements.push({ setAttribute() { throw new Error("HTMLElement以外は変更しません。"); } });
  const document = {
    documentElement: { lang },
    addEventListener(name: string, listener: () => void) { events.push({ name, listener }); },
    querySelectorAll(selector: string) { selectors.push(selector); return elements; },
  };
  runInContext(createPreviewLabelScript, createContext({ document, HTMLElement: Fieldset }));
  return { document, labels, selectors, events,
    ready() { assert.equal(events.length, 1); assert.equal(events[0].name, "DOMContentLoaded"); events[0].listener(); },
  };
}

test("DOMContentLoaded前はDOMを読まず、ラベルを変更しない", () => {
  const view = page("ja");
  assert.equal(view.events.length, 1);
  assert.deepEqual(view.selectors, []);
  assert.deepEqual(view.labels, []);
  view.ready();
  assert.deepEqual(view.selectors, [".create-studio [data-create-preview-label]"]);
  assert.deepEqual(view.labels, [{ name: "aria-label", value: "SNSプレビュー" }]);
});

test("DOMContentLoaded時の現在の文書言語で全対象を設定する", () => {
  const view = page("ja", 2);
  view.document.documentElement.lang = "en";
  view.ready();
  assert.deepEqual(view.labels, [
    { name: "aria-label", value: "Social preview" },
    { name: "aria-label", value: "Social preview" },
  ]);
});

test("en以外は従来の日本語ラベルを使う", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) {
    const view = page(lang);
    view.ready();
    assert.deepEqual(view.labels, [{ name: "aria-label", value: "SNSプレビュー" }]);
  }
});

test("対象なしとHTMLElement以外を安全に通過する", () => {
  const empty = page("en", 0);
  empty.ready();
  assert.deepEqual(empty.labels, []);
  const mixed = page("en", 1, true);
  mixed.ready();
  assert.deepEqual(mixed.labels, [{ name: "aria-label", value: "Social preview" }]);
});

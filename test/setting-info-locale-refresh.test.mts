import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { settingInfoLocaleRefreshCode } from "../src/setting-info-locale-refresh-script.ts";

class MockElement {
  tagName: string;
  constructor(tagName = "DIV") { this.tagName = tagName; }
}
class MockInput extends MockElement {
  action: (event: { type: string; bubbles: boolean }) => void;
  constructor(action: MockInput["action"]) { super("INPUT"); this.action = action; }
  dispatchEvent(event: { type: string; bubbles: boolean }) { this.action(event); return true; }
}
type TextNode = { nodeValue: string | null; parentElement: MockElement | null };
function page(lang: string, studio: unknown = new MockElement(), nodes: TextNode[] = []) {
  const trace: string[] = [], toggles: MockElement[] = [];
  const events: { callback: () => void; once: boolean }[] = [];
  const document = {
    documentElement: { lang }, studio,
    addEventListener(type: string, callback: () => void, options: { once: boolean }) { assert.equal(type, "DOMContentLoaded"); trace.push("register"); events.push({ callback, once: options.once }); },
    querySelectorAll(selector: string) { assert.equal(selector, "[data-condition-toggle]"); trace.push("toggles"); return toggles; },
    querySelector(selector: string) { assert.equal(selector, ".create-studio"); trace.push("studio"); return document.studio; },
    createTreeWalker(root: MockElement, filter: number) { assert.equal(root, document.studio); assert.equal(filter, 4); trace.push("walker"); let index = 0; return { currentNode: nodes[0], nextNode() { this.currentNode = nodes[index++]; return this.currentNode !== undefined; } }; },
  };
  class MockEvent { type: string; bubbles: boolean; constructor(type: string, options: { bubbles: boolean }) { this.type = type; this.bubbles = options.bubbles; } }
  return { document, trace, toggles, nodes,
    start() { runInNewContext(settingInfoLocaleRefreshCode, { document, HTMLInputElement: MockInput, HTMLElement: MockElement, NodeFilter: { SHOW_TEXT: 4 }, Event: MockEvent }); },
    fire() { const current = events.slice(); for (const event of current) { if (event.once) events.splice(events.indexOf(event), 1); event.callback(); } },
  };
}

test("DOMContentLoaded前は登録だけ行い、発火時は全言語でinputのchangeを一度送る", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) {
    const view = page(lang), events: { type: string; bubbles: boolean }[] = [];
    view.toggles.push(new MockInput(event => { events.push(event); view.trace.push("first"); }), new MockElement(), new MockInput(event => { events.push(event); view.trace.push("second"); }));
    view.start(); assert.deepEqual(view.trace, ["register"]); view.fire(); view.fire();
    assert.deepEqual(view.trace, ["register", "toggles", "first", "second"]);
    assert.equal(events.length, 2); for (const event of events) { assert.equal(event.type, "change"); assert.equal(event.bubbles, true); }
  }
});

test("togglechangeの結果を受けて言語とstudioを判定し、5文言と前後空白を保持する", () => {
  const parent = new MockElement();
  const words = ["英数字、ハイフン、アンダースコア。未入力なら自動生成します。", "作成される短縮URL", "リンクを終了", "選択した方法で設定します。", "転送先の切替を設定中は、SNSプレビューは利用できません。"];
  const nodes = words.map(value => ({ nodeValue: ` ${value}\n`, parentElement: parent })), view = page("ja", null, nodes);
  view.toggles.push(new MockInput(() => { view.trace.push("change"); view.document.documentElement.lang = "en"; view.document.studio = parent; }));
  view.start(); view.fire();
  assert.deepEqual(view.trace, ["register", "toggles", "change", "studio", "walker"]);
  assert.deepEqual(nodes.map(node => node.nodeValue), [" Use letters, numbers, hyphens, and underscores. Leave blank to generate one.\n", " Your short URL\n", " End the link\n", " Choose how to set the social preview.\n", " Social previews are unavailable while destination switching is set.\n"]);
});

test("studioなし・非HTMLElement、除外tag・未知/空/parentなしを変更しない", () => {
  for (const studio of [null, {}]) { const view = page("en", studio); view.start(); view.fire(); assert.deepEqual(view.trace, ["register", "toggles", "studio"]); }
  const excluded = ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"].map(tag => ({ nodeValue: "リンクを終了", parentElement: new MockElement(tag) }));
  const nodes: TextNode[] = [...excluded, { nodeValue: "unknown", parentElement: new MockElement() }, { nodeValue: "", parentElement: new MockElement() }, { nodeValue: null, parentElement: new MockElement() }, { nodeValue: "リンクを終了", parentElement: null }];
  const view = page("en", new MockElement(), nodes); view.start(); view.fire();
  assert.deepEqual(nodes.map(node => node.nodeValue), [...Array(4).fill("リンクを終了"), "unknown", "", null, "リンクを終了"]);
  const empty = page("en"); empty.start(); empty.fire(); assert.deepEqual(empty.nodes, []);
});

test("changeで非enへ変わった場合は走査せず、例外では後続toggleと翻訳を開始しない", () => {
  const view = page("en"); view.toggles.push(new MockInput(() => { view.document.documentElement.lang = "ja"; })); view.start(); view.fire(); assert.deepEqual(view.trace, ["register", "toggles"]);
  const failed = page("en"); failed.toggles.push(new MockInput(() => { throw new Error("toggle failure"); }), new MockInput(() => { failed.trace.push("second"); }));
  failed.start(); assert.throws(() => failed.fire(), /toggle failure/); failed.fire(); assert.deepEqual(failed.trace, ["register", "toggles"]);
});

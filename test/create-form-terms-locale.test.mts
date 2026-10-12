import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createFormTermsLocaleCode } from "../src/create-form-terms-locale-script.ts";

class MockElement {
  nodeType = 1;
  children: (MockElement | MockText)[] = [];
  tagName: string;
  constructor(tagName = "DIV") { this.tagName = tagName; }
}
class MockText {
  nodeType = 3;
  nodeValue: string | null;
  parentElement: MockElement | null;
  constructor(nodeValue: string | null, parentElement: MockElement | null) { this.nodeValue = nodeValue; this.parentElement = parentElement; parentElement?.children.push(this); }
}
function page(lang: string) {
  const body = new MockElement("BODY"), frames: (() => void)[] = [], roots: MockElement[] = [];
  const observed: { root: MockElement; options: { subtree: boolean; childList: boolean } }[] = [];
  let changed: (records: { addedNodes: (MockElement | MockText)[] }[]) => void = () => { throw new Error("observer not registered"); };
  const document = { documentElement: { lang }, body, createTreeWalker(root: MockElement, filter: number) {
    assert.equal(filter, 4); roots.push(root);
    const nodes: MockText[] = [];
    const collect = (element: MockElement) => { for (const child of element.children) child instanceof MockText ? nodes.push(child) : collect(child); };
    collect(root); let index = 0;
    return { currentNode: nodes[0], nextNode() { this.currentNode = nodes[index++]; return this.currentNode !== undefined; } };
  } };
  class Observer {
    constructor(callback: typeof changed) { changed = callback; }
    observe(root: MockElement, options: { subtree: boolean; childList: boolean }) { observed.push({ root, options }); }
  }
  return { body, document, frames, roots, observed,
    start() { runInNewContext(createFormTermsLocaleCode, { document, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ addedNodes }]); },
  };
}

test("en以外ではDOM走査・RAF・observerを登録しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) {
    const view = page(lang); view.start();
    assert.deepEqual(view.frames, []); assert.deepEqual(view.observed, []); assert.deepEqual(view.roots, []);
  }
});

test("最初のRAFで4文言を翻訳し、前後の空白を保持する", () => {
  const view = page("en");
  const texts = [" 有効期限（任意）\n", "リンク終了時の表示（任意）", "終了メッセージ", "入力・表示はお使いの端末の現地時間です。JavaScriptを無効にしている場合はUTCとして扱います。"].map(value => new MockText(value, view.body));
  view.start(); assert.equal(texts[0].nodeValue, " 有効期限（任意）\n"); assert.deepEqual(view.roots, []);
  view.tick();
  assert.deepEqual(texts.map(node => node.nodeValue), [" Expiration (optional)\n", "End display (optional)", "End message", "Times are shown and entered in your local time. With JavaScript disabled, UTC is used."]);
  assert.equal(view.observed[0].root, view.body);
  assert.equal(view.observed[0].options.subtree, true); assert.equal(view.observed[0].options.childList, true);
  assert.equal(Object.keys(view.observed[0].options).length, 2);
});

test("除外tag・未知値・空値と空DOMを維持する", () => {
  const view = page("en"), excluded: MockText[] = [];
  for (const tag of ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"]) { const element = new MockElement(tag); view.body.children.push(element); excluded.push(new MockText("終了メッセージ", element)); }
  const others = ["unknown", "", null].map(value => new MockText(value, view.body));
  view.start(); view.tick();
  assert.deepEqual(excluded.map(node => node.nodeValue), Array(4).fill("終了メッセージ")); assert.deepEqual(others.map(node => node.nodeValue), ["unknown", "", null]);
  const empty = page("en"); empty.start(); empty.tick(); assert.deepEqual(empty.body.children, []);
});

test("追加textは親を再走査し、追加Elementだけを直接走査する", () => {
  const view = page("en"); view.start(); view.tick(); view.document.documentElement.lang = "ja";
  const parent = new MockElement(), first = new MockText("終了メッセージ", parent), sibling = new MockText("有効期限（任意）", parent);
  const added = new MockElement(), nested = new MockText("リンク終了時の表示（任意）", added), detached = new MockText("終了メッセージ", null);
  view.mutate(first, added, detached);
  assert.deepEqual(view.roots, [view.body, parent, added]);
  assert.equal(first.nodeValue, "End message"); assert.equal(sibling.nodeValue, "Expiration (optional)"); assert.equal(nested.nodeValue, "End display (optional)"); assert.equal(detached.nodeValue, "終了メッセージ");
});

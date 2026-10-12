import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createFormDynamicLocaleCode } from "../src/create-form-dynamic-locale-script.ts";

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
  const observed: { root: MockElement; options: { subtree: boolean; childList: boolean; characterData: boolean } }[] = [];
  let changed: (records: { type: string; target?: MockText; addedNodes: (MockElement | MockText)[] }[]) => void = () => { throw new Error("observer not registered"); };
  const document = { documentElement: { lang }, body, createTreeWalker(root: MockElement, filter: number) {
    assert.equal(filter, 4); roots.push(root);
    const nodes: MockText[] = [];
    const collect = (element: MockElement) => { for (const child of element.children) child instanceof MockText ? nodes.push(child) : collect(child); };
    collect(root); let index = 0;
    return { currentNode: nodes[0], nextNode() { this.currentNode = nodes[index++]; return this.currentNode !== undefined; } };
  } };
  class Observer {
    constructor(callback: typeof changed) { changed = callback; }
    observe(root: MockElement, options: { subtree: boolean; childList: boolean; characterData: boolean }) { observed.push({ root, options }); }
  }
  return { body, document, frames, roots, observed,
    start() { runInNewContext(createFormDynamicLocaleCode, { document, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    character(target: MockText) { changed([{ type: "characterData", target, addedNodes: [] }]); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ type: "childList", addedNodes }]); },
  };
}


test("初回en以外ではRAF・observerを登録せず、後でenに変わっても開始しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) { const view = page(lang); view.start(); view.document.documentElement.lang = "en"; assert.deepEqual(view.frames, []); assert.deepEqual(view.observed, []); assert.deepEqual(view.roots, []); }
});

test("初回RAFは5文言と空白を保持して翻訳し、後続言語を再判定しない", () => {
  const view = page("en");
  const values = [" 指定日時以降の転送先URL\n", "SNSプレビューは付けません。", "保存時に転送先ページからSNSプレビュー情報を取得します。", "アクセス時点の転送先URLをSNSプレビューに表示します。", "タイトルと説明を入力してください。"];
  const nodes = values.map(value => new MockText(value, view.body)); view.start(); assert.deepEqual(view.roots, []); view.document.documentElement.lang = "ja"; view.tick();
  assert.deepEqual(nodes.map(node => node.nodeValue), [" Destination from the selected time\n", "No social preview is added.", "The preview is imported from the destination when you save.", "The destination URL at the time of access is shown in the social preview.", "Enter a title and description."]);
  assert.equal(view.observed[0].root, view.body); assert.equal(view.observed[0].options.subtree, true); assert.equal(view.observed[0].options.childList, true); assert.equal(view.observed[0].options.characterData, true); assert.equal(Object.keys(view.observed[0].options).length, 3);
});

test("追加textはそのNodeだけを変換し、追加Elementは配下を走査する", () => {
  const view = page("en"); view.start(); view.tick();
  const parent = new MockElement(), added = new MockText("SNSプレビューは付けません。", parent), sibling = new MockText("タイトルと説明を入力してください。", parent);
  const element = new MockElement(), nested = new MockText("指定日時以降の転送先URL", element), orphan = new MockText("SNSプレビューは付けません。", null);
  view.mutate(added, element, orphan);
  assert.equal(added.nodeValue, "No social preview is added."); assert.equal(sibling.nodeValue, "タイトルと説明を入力してください。"); assert.equal(nested.nodeValue, "Destination from the selected time"); assert.equal(orphan.nodeValue, "SNSプレビューは付けません。"); assert.deepEqual(view.roots, [view.body, element]);
});

test("characterDataは対象だけを再変換し、除外tag・未知/空値・空DOMを維持する", () => {
  const view = page("en"), node = new MockText("unknown", view.body), sibling = new MockText("unknown", view.body); view.start(); view.tick();
  node.nodeValue = " タイトルと説明を入力してください。\n"; sibling.nodeValue = "指定日時以降の転送先URL"; view.character(node); view.character(node);
  assert.equal(node.nodeValue, " Enter a title and description.\n"); assert.equal(sibling.nodeValue, "指定日時以降の転送先URL"); assert.deepEqual(view.roots, [view.body]);
  for (const tag of ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"]) { const text = new MockText("SNSプレビューは付けません。", new MockElement(tag)); view.character(text); assert.equal(text.nodeValue, "SNSプレビューは付けません。"); }
  for (const value of ["unknown", "", null]) { const text = new MockText(value, view.body); view.character(text); assert.equal(text.nodeValue, value); }
  const empty = page("en"); empty.start(); empty.tick(); assert.deepEqual(empty.body.children, []);
});

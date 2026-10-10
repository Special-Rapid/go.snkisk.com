import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { homePolishLocaleCode } from "../src/home-polish-locale-script.ts";

class MockElement {
  nodeType = 1;
  children: (MockElement | MockText)[] = [];
  tagName: string;
  parentElement: MockElement | null = null;
  noI18n = false;
  closest(selector: string): MockElement | null { assert.equal(selector, "[data-no-i18n]"); return this.noI18n ? this : this.parentElement?.closest(selector) ?? null; }
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
    start() { runInNewContext(homePolishLocaleCode, { document, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    character(target: MockText) { changed([{ type: "characterData", target, addedNodes: [] }]); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ type: "childList", addedNodes }]); },
  };
}



const japanese = ["共有の条件やタイミングも設定できる短縮URLです。", "最初の相手別の入口を追加（任意）", "アクセス履歴・IPアドレス・User-Agentは保存しません。利用回数制限を設定した場合のみ、累計利用回数を保持します。"];
const english = ["A short link with optional sharing conditions and timing.", "Add the first audience entry (optional)", "Access history, IP addresses, and User-Agent strings are not stored. An aggregate usage count is kept only when a usage limit is set."];

test("初回en以外では開始せず、後続enでもRAF・監視を追加しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) { const view = page(lang); view.start(); view.document.documentElement.lang = "en"; assert.deepEqual(view.frames, []); assert.deepEqual(view.observed, []); }
});

test("RAFは3文言と空白を保持し、開始後の言語変更を再判定しない", () => {
  const view = page("en"), nodes = japanese.map(value => new MockText(` ${value}\n`, view.body));
  view.start(); assert.deepEqual(view.roots, []); view.document.documentElement.lang = "ja"; view.tick();
  assert.deepEqual(nodes.map(node => node.nodeValue), english.map(value => ` ${value}\n`));
  assert.equal(view.observed[0].root, view.body); assert.deepEqual(Object.keys(view.observed[0].options), ["subtree", "childList", "characterData"]);
  assert.equal(view.observed[0].options.subtree, true); assert.equal(view.observed[0].options.childList, true); assert.equal(view.observed[0].options.characterData, true);
});

test("自身または祖先のdata-no-i18nはRAF・直接変換・追加Element走査を除外する", () => {
  for (const ancestor of [false, true]) {
    const view = page("en"), marked = new MockElement(), parent = ancestor ? new MockElement() : marked;
    marked.noI18n = true; if (ancestor) { parent.parentElement = marked; marked.children.push(parent); }
    view.body.children.push(marked); const node = new MockText(japanese[0], parent); view.start(); view.tick();
    assert.equal(node.nodeValue, japanese[0]); view.character(node); view.mutate(node, marked); assert.equal(node.nodeValue, japanese[0]);
    marked.noI18n = false; view.character(node); assert.equal(node.nodeValue, english[0]);
  }
});

test("追加textとcharacterDataは対象だけを変換し、追加Elementは配下を走査する", () => {
  const view = page("en"); view.start(); view.tick();
  const parent = new MockElement(), node = new MockText(japanese[0], parent), sibling = new MockText(japanese[1], parent);
  const element = new MockElement(), nested = new MockText(japanese[2], element), orphan = new MockText(japanese[0], null);
  view.mutate(node, element, orphan); assert.equal(node.nodeValue, english[0]); assert.equal(sibling.nodeValue, japanese[1]); assert.equal(nested.nodeValue, english[2]); assert.equal(orphan.nodeValue, japanese[0]);
  view.character(sibling); view.character(sibling); assert.equal(sibling.nodeValue, english[1]); assert.deepEqual(view.roots, [view.body, element]);
});

test("除外tag、空/未知値、空DOMを保持する", () => {
  const view = page("en"); view.start(); view.tick(); assert.deepEqual(view.body.children, []);
  for (const tag of ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"]) { const text = new MockText(japanese[0], new MockElement(tag)); view.character(text); assert.equal(text.nodeValue, japanese[0]); }
  for (const value of ["unknown", "", null]) { const text = new MockText(value, view.body); view.character(text); assert.equal(text.nodeValue, value); }
});

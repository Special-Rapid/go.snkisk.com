import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { entryExpiryLocaleCode } from "../src/entry-expiry-locale-script.ts";

class MockElement {
  nodeType = 1;
  children: (MockElement | MockText)[] = [];
  tagName: string;
  parentElement: MockElement | null = null;
  noI18n = false;
  attributes = new Map<string, string>();
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  querySelectorAll(selector: string) { assert.equal(selector, "[placeholder]"); const found: MockElement[] = []; const visit = (element: MockElement) => { for (const child of element.children) if (child instanceof MockElement) { if (child.attributes.has("placeholder")) found.push(child); visit(child); } }; visit(this); return found; }
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
    start() { runInNewContext(entryExpiryLocaleCode, { document, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    character(target: MockText) { changed([{ type: "characterData", target, addedNodes: [] }]); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ type: "childList", addedNodes }]); },
  };
}

const japanese = ["指定時刻を過ぎると、この入口は利用できなくなります。", "入口の期限切れや、親リンクの利用回数上限到達後に表示します。未入力なら親リンクのメッセージまたは既定文を表示します。", "作成日時", "入口の短縮パス（必須）", "例: 友達用・QR用"];
const english = ["This entry becomes unavailable after the selected time.", "Shown when this entry expires or the parent link reaches its usage limit. Leave blank to use the parent message or default text.", "Created", "Entry short path (required)", "Example: friends or QR"];

test("初回en以外は開始せず、開始後は言語を再判定しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) { const view = page(lang); view.start(); view.document.documentElement.lang = "en"; assert.deepEqual(view.frames, []); assert.deepEqual(view.observed, []); }
  const view = page("en"), node = new MockText(japanese[0], view.body); view.start(); view.document.documentElement.lang = "ja"; view.tick(); assert.equal(node.nodeValue, english[0]);
});

test("RAFは全5文言と空白を保持し、placeholderは子孫だけを完全一致で変換する", () => {
  const view = page("en"), nodes = japanese.map(value => new MockText(` ${value}\n`, view.body));
  view.body.setAttribute("placeholder", japanese[0]); const inputs = japanese.map(value => { const input = new MockElement("INPUT"); input.setAttribute("placeholder", value); view.body.children.push(input); return input; });
  const padded = new MockElement("INPUT"); padded.setAttribute("placeholder", ` ${japanese[4]} `); view.body.children.push(padded);
  view.start(); view.tick(); assert.deepEqual(nodes.map(node => node.nodeValue), english.map(value => ` ${value}\n`)); assert.deepEqual(inputs.map(input => input.getAttribute("placeholder")), english);
  assert.equal(view.body.getAttribute("placeholder"), japanese[0]); assert.equal(padded.getAttribute("placeholder"), ` ${japanese[4]} `);
  assert.equal(view.observed[0].root, view.body); assert.deepEqual(Object.keys(view.observed[0].options), ["subtree", "childList", "characterData"]); assert.equal(view.observed[0].options.subtree, true); assert.equal(view.observed[0].options.childList, true); assert.equal(view.observed[0].options.characterData, true);
});

test("textは祖先やtagで除外するが、子孫placeholderは同じ除外を使わない", () => {
  const view = page("en"), marked = new MockElement(), parent = new MockElement(); marked.noI18n = true; parent.parentElement = marked; marked.children.push(parent); view.body.children.push(marked);
  const node = new MockText(japanese[0], parent), input = new MockElement("INPUT"); input.parentElement = parent; input.setAttribute("placeholder", japanese[4]); parent.children.push(input);
  view.start(); view.tick(); view.character(node); assert.equal(node.nodeValue, japanese[0]); assert.equal(input.getAttribute("placeholder"), english[4]);
  marked.noI18n = false; view.character(node); assert.equal(node.nodeValue, english[0]);
  for (const tag of ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"]) { const text = new MockText(japanese[0], new MockElement(tag)); view.character(text); assert.equal(text.nodeValue, japanese[0]); }
});

test("追加textとcharacterDataは対象だけ、追加Elementはtextと子孫placeholderを走査する", () => {
  const view = page("en"); view.start(); view.tick(); const parent = new MockElement(), node = new MockText(japanese[2], parent), sibling = new MockText(japanese[3], parent), input = new MockElement("INPUT"); input.setAttribute("placeholder", japanese[4]); parent.children.push(input);
  view.mutate(node); assert.equal(node.nodeValue, english[2]); assert.equal(sibling.nodeValue, japanese[3]); assert.equal(input.getAttribute("placeholder"), japanese[4]); view.character(sibling); assert.equal(sibling.nodeValue, english[3]);
  parent.setAttribute("placeholder", japanese[4]); view.mutate(parent); assert.equal(input.getAttribute("placeholder"), english[4]); assert.equal(parent.getAttribute("placeholder"), japanese[4]); assert.deepEqual(view.roots, [view.body, parent]);
  input.setAttribute("placeholder", japanese[4]); view.character(node); assert.equal(input.getAttribute("placeholder"), japanese[4]);
});

test("孤立Node・空/未知値・属性欠落・空DOMを保持する", () => {
  const view = page("en"); view.start(); view.tick(); assert.deepEqual(view.body.children, []); const orphan = new MockText(japanese[0], null); view.mutate(orphan); assert.equal(orphan.nodeValue, japanese[0]);
  for (const value of ["unknown", "", null]) { const text = new MockText(value, view.body); view.character(text); assert.equal(text.nodeValue, value); }
  const element = new MockElement(), input = new MockElement("INPUT"); element.children.push(input); view.mutate(element); assert.equal(input.getAttribute("placeholder"), null); assert.equal(input.attributes.size, 0);
});

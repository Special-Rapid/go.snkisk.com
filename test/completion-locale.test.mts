import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { completionLocaleCode } from "../src/completion-locale-script.ts";

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
    start() { runInNewContext(completionLocaleCode, { document, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    character(target: MockText) { changed([{ type: "characterData", target, addedNodes: [] }]); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ type: "childList", addedNodes }]); },
  };
}



const japanese = ["リンクの作成・管理にはCloudflare Turnstileによる確認が必要です。送信時にCloudflareのプライバシーポリシーと利用規約が適用されます。", "短縮URLを作成する前に、転送先URLを入力してください。", "相手別の入口を追加", "入口を更新する", "親リンクの転送先ページからOG情報を取り込む", "現在の親リンクの転送先URLを表示する", "リンク設定が更新されました。もう一度開いてください。", "相手別の入口を追加しました。", "入口を更新しました。", "入口を削除しました。短縮パスは再利用できません。", "この入口は存在しません。"];
const english = ["Creating and managing links requires Cloudflare Turnstile verification. Cloudflare's Privacy Policy and Terms of Service apply when you submit.", "Enter a destination URL before creating a short link.", "Add an audience entry", "Update entry", "Import preview from the parent destination", "Show the current parent destination URL", "The link settings changed. Please open the link again.", "Audience entry added.", "Entry updated.", "Entry deleted. Its short path cannot be reused.", "This entry does not exist."];

test("初回en以外では開始せず、後続enでもRAF・監視を追加しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) { const view = page(lang); view.start(); view.document.documentElement.lang = "en"; assert.deepEqual(view.frames, []); assert.deepEqual(view.observed, []); }
});

test("RAFは一致する11文言と空白を保持し、開始後の言語変更を再判定しない", () => {
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


test("末尾空白を含む期限keyはtrim後一致せず、既存どおり変換しない", () => {
  const view = page("en"), values = ["期限: ", "期限:", " 期限:  "];
  const nodes = values.map(value => new MockText(value, view.body)); view.start(); view.tick();
  assert.deepEqual(nodes.map(node => node.nodeValue), values);
  for (const node of nodes) { view.character(node); view.mutate(node); }
  assert.deepEqual(nodes.map(node => node.nodeValue), values);
});

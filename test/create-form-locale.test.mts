import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createFormLocaleCode } from "../src/create-form-locale-script.ts";

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
    start() { runInNewContext(createFormLocaleCode, { document, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    character(target: MockText) { changed([{ type: "characterData", target, addedNodes: [] }]); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ type: "childList", addedNodes }]); },
  };
}



const japanese = ["最初の転送先URL", "詳細設定（任意）", "設定内容", "利用可能な条件", "利用開始日時", "有効期限", "利用回数無制限", "転送ルール", "アクセス保護", "終了時の表示", "表示設定", "最初の相手別入口", "今すぐ利用可能", "有効期限なし", "合言葉なし", "転送ルールなし", "転送先URLを入力してください", "優先順位: 有効期限 → 利用開始・合言葉 → 利用回数上限 → 指定日時以降の転送先", "利用開始日時・有効期限・利用回数を設定できます。", "条件に応じて転送先を切り替えます。", "上限に達する最後の1回は現在の転送先へ開きます。利用回数の上限も設定してください。", "選択した方法でSNSプレビューを設定します。", "利用できる期間", "指定した期間のみ有効", "開始日時", "終了日時", "どちらか一方だけでも設定できます。終了後は下記の「終了時の表示」が適用されます。", "回数制限", "アクセスできる回数の上限", "上限回数", "通常アクセスのみ数えます。SNSプレビューは数えません。", "上限到達後の動作", "リンクを終了（終了メッセージを表示）", "別のURLへ転送", "転送先URL", "日時で転送先を変更", "指定日時以降に別URLへ転送", "日時と転送先URLの両方を入力してください。", "合言葉で保護", "合言葉を入力した人だけに公開", "動作ルール", "利用開始・アクセス保護", "リンクを利用できなくなったときの案内", "SNSで共有したときのプレビュー", "相手・用途別の入口URLを同時に作成"];
const english = ["Initial destination URL", "Advanced settings (optional)", "Settings summary", "Availability conditions", "Available from", "Expiration", "Unlimited uses", "Redirect rules", "Access protection", "End display", "Display settings", "First audience entry", "Available now", "No expiration", "No passphrase", "No redirect rules", "Enter a destination URL", "Priority: expiration → availability/passphrase → usage limit → scheduled destination", "Set availability, expiration, and usage limits.", "Switch the destination based on conditions.", "The final allowed visit opens the current destination. Also set a usage limit.", "Configure the social preview with the selected method.", "Availability window", "Only available during the selected window", "Start time", "End time", "You can set either time independently. The end display below is used after expiration.", "Usage limit", "Maximum number of allowed visits", "Maximum uses", "Only normal visits count. Social previews do not count.", "After-limit action", "End the link (show the end message)", "Redirect to another URL", "Destination URL", "Change destination by time", "Redirect to another URL from the selected time", "Enter both a time and a destination URL.", "Protect with a passphrase", "Only people with the passphrase can access it.", "Behavior rules", "Availability and access protection", "A message shown when the link ends", "Social preview shown when shared", "Create one audience- or purpose-specific entry URL"];

test("初回en以外は後続enでもRAF・監視を開始しない", () => {
  for (const lang of ["ja", "en-US", "", "fr"]) { const view=page(lang); view.start(); view.document.documentElement.lang="en"; assert.deepEqual(view.frames,[]); assert.deepEqual(view.observed,[]); }
});
test("RAFは45文言を前後空白付きで変換し、監視3項目を維持する", () => {
  const view=page("en"),nodes=japanese.map(value=>new MockText(` ${value}\n`,view.body)); view.start(); assert.deepEqual(view.roots,[]); view.tick();
  assert.deepEqual(nodes.map(node=>node.nodeValue),english.map(value=>` ${value}\n`)); assert.equal(view.observed[0].root,view.body);
  assert.deepEqual(Object.keys(view.observed[0].options),["subtree","childList","characterData"]); assert.equal(view.observed[0].options.subtree,true); assert.equal(view.observed[0].options.childList,true); assert.equal(view.observed[0].options.characterData,true);
});
test("開始後も変換ごとにlangを再判定し、enに戻った通知で変換を再開する", () => {
  const view=page("en"),node=new MockText(japanese[0],view.body);view.start();view.document.documentElement.lang="ja";view.tick();assert.equal(node.nodeValue,japanese[0]);view.character(node);view.mutate(node);assert.equal(node.nodeValue,japanese[0]);
  view.document.documentElement.lang="en";view.character(node);assert.equal(node.nodeValue,english[0]);node.nodeValue=japanese[1];view.document.documentElement.lang="ja";view.character(node);assert.equal(node.nodeValue,japanese[1]);view.document.documentElement.lang="en";view.mutate(node);assert.equal(node.nodeValue,english[1]);
});
test("data-no-i18n祖先guardを追加せずOPTIONも翻訳する", () => {
  for (const ancestor of [false,true]) { const view=page("en"),marked=new MockElement(),parent=ancestor?new MockElement("OPTION"):marked;marked.noI18n=true;if(ancestor){parent.parentElement=marked;marked.children.push(parent);}view.body.children.push(marked);const node=new MockText(japanese[0],parent);view.start();view.tick();assert.equal(node.nodeValue,english[0]); }
  const view=page("en");view.start();view.tick();const option=new MockText(japanese[1],new MockElement("OPTION"));view.character(option);assert.equal(option.nodeValue,english[1]);
});
test("characterData・追加textは直接変換し、追加Elementだけ配下走査する", () => {
 const view=page("en");view.start();view.tick();const parent=new MockElement(),node=new MockText(japanese[0],parent),sibling=new MockText(japanese[1],parent),added=new MockElement(),nested=new MockText(japanese[2],added),orphan=new MockText(japanese[0],null);view.mutate(node,added,orphan);assert.equal(node.nodeValue,english[0]);assert.equal(sibling.nodeValue,japanese[1]);assert.equal(nested.nodeValue,english[2]);assert.equal(orphan.nodeValue,japanese[0]);view.character(sibling);assert.equal(sibling.nodeValue,english[1]);assert.deepEqual(view.roots,[view.body,added]);
});
test("除外3tag、空・未知値、空DOMを保持する", () => {
 const view=page("en");view.start();view.tick();assert.deepEqual(view.body.children,[]);for(const tag of ["SCRIPT","STYLE","TEXTAREA"]){const node=new MockText(japanese[0],new MockElement(tag));view.character(node);assert.equal(node.nodeValue,japanese[0]);}for(const value of ["unknown","",null]){const node=new MockText(value,view.body);view.character(node);assert.equal(node.nodeValue,value);}
});

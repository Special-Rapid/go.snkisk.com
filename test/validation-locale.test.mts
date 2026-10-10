import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { validationLocaleCode } from "../src/validation-locale-script.ts";

class MockElement {
  nodeType = 1;
  children: (MockElement | MockText)[] = [];
  tagName: string;
  parentElement: MockElement | null = null;
  noI18n = false;
  dataset: { localTime?: string } = {};
  textContent: string | null = "untouched";
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
  const dates: MockElement[] = [], dateTrace: string[] = [];
  class Formatter {
    constructor(language?: string, options?: { timeZoneName?: string; dateStyle?: string; timeStyle?: string }) { if(language) assert.equal(language,"en"); if(options?.timeZoneName) assert.equal(options.timeZoneName,"shortOffset"); if(options?.dateStyle) { assert.equal(options.dateStyle,"medium"); assert.equal(options.timeStyle,"short"); } }
    resolvedOptions() { dateTrace.push("zone"); return { timeZone: "Asia/Tokyo" }; }
    formatToParts(date: Date) { dateTrace.push("parts"); assert(!Number.isNaN(date.getTime())); return [{ type: "timeZoneName", value: "GMT+9" }]; }
    format(date: Date) { dateTrace.push("format"); return date.toISOString(); }
  }
  function DateTimeFormat(language?: string, options?: ConstructorParameters<typeof Formatter>[1]) { return new Formatter(language, options); }
  const body = new MockElement("BODY"), frames: (() => void)[] = [], roots: MockElement[] = [];
  const observed: { root: MockElement; options: { subtree: boolean; childList: boolean; characterData: boolean } }[] = [];
  let changed: (records: { type: string; target?: MockText; addedNodes: (MockElement | MockText)[] }[]) => void = () => { throw new Error("observer not registered"); };
  const document = { documentElement: { lang }, body, querySelectorAll(selector: string) { assert.equal(selector,"[data-local-time]"); dateTrace.push("query"); return dates; }, createTreeWalker(root: MockElement, filter: number) {
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
  return { body, document, frames, roots, observed, dates, dateTrace,
    start() { runInNewContext(validationLocaleCode, { document, Date, Intl: { DateTimeFormat }, Node: { TEXT_NODE: 3 }, Element: MockElement, NodeFilter: { SHOW_TEXT: 4 }, requestAnimationFrame(fn: () => void) { frames.push(fn); }, MutationObserver: Observer }); },
    tick() { const frame = frames.shift(); assert(frame); frame(); },
    character(target: MockText) { changed([{ type: "characterData", target, addedNodes: [] }]); },
    mutate(...addedNodes: (MockElement | MockText)[]) { changed([{ type: "childList", addedNodes }]); },
  };
}



const japanese = ["有効なURLを入力してください。", "有効な短縮パスを入力してください。", "切替日時が正しくありません。", "転送先の切替には、切替後URLと切替日時の両方を入力してください。", "切替後の転送先URLが有効ではありません。", "公開開始日時が正しくありません。", "共有期限が正しくありません。", "上限到達後の転送を使うには、利用回数の上限を設定してください。", "上限到達後の転送先URLが有効ではありません。", "合言葉は256文字以内にしてください。", "SNSプレビューの設定が正しくありません。", "転送先のOG情報を取得できませんでした。HTTPSの公開HTMLページを指定してください。", "指定プレビューにはタイトルと説明を入力してください。", "SNSプレビューのタイトルまたは説明が長すぎます。", "プレビュー画像には公開HTTPS URLを入力してください。", "入口の短縮パスを入力してください。", "入口のSNSプレビュー設定が正しくありません。", "親リンクの転送先からOG情報を取得できませんでした。", "入口の指定プレビューには適切なタイトルと説明を入力してください。", "入口のプレビュー画像には公開HTTPS URLを入力してください。", "合言葉の変更と解除を同時には行えません。", "入口は存在しません。"];
const english = ["Enter a valid URL.", "Enter a valid short path.", "The switch time is invalid.", "Enter both the destination after switching and the switch time.", "The destination after switching is invalid.", "The availability time is invalid.", "The expiration time is invalid.", "Set a usage limit to use the after-limit redirect.", "The destination after the limit is invalid.", "The passphrase must be 256 characters or fewer.", "The social preview setting is invalid.", "Could not fetch preview data from the destination. Use a public HTTPS HTML page.", "Enter a title and description for the custom preview.", "The social preview title or description is too long.", "Enter a public HTTPS URL for the preview image.", "Enter an entry short path.", "The entry social preview setting is invalid.", "Could not fetch preview data from the parent destination.", "Enter a valid title and description for the entry preview.", "Enter a public HTTPS URL for the entry preview image.", "You cannot change and remove the passphrase at the same time.", "This entry does not exist."];

test("初回en以外は後続enでも開始しない", () => {
 for(const lang of ["ja","en-US","", "fr"]){const view=page(lang);view.start();view.document.documentElement.lang="en";assert.deepEqual(view.frames,[]);assert.deepEqual(view.observed,[]);assert.deepEqual(view.dateTrace,[]);}
});
test("RAFは22固定文言と前後空白を翻訳し、後続langを再判定しない", () => {
 const view=page("en"),nodes=japanese.map(value=>new MockText(` ${value}\n`,view.body));view.start();view.document.documentElement.lang="ja";view.tick();assert.deepEqual(nodes.map(node=>node.nodeValue),english.map(value=>` ${value}\n`));assert.deepEqual(Object.keys(view.observed[0].options),["subtree","childList","characterData"]);
});
test("4正規表現の文言と数字を変換し、未知値を保持する", () => {
 const view=page("en"),inputs=["利用回数の上限は1,234回以下で入力してください。","利用回数の上限は1以上の整数で入力してください。","終了後メッセージは240文字以内にしてください。","入口ラベルは1〜32文字で入力してください。"],expected=["The usage limit must be 1,234 or fewer.","The usage limit must be a whole number of at least 1.","The unavailable message must be 240 characters or fewer.","The entry label must contain 1 to 32 characters."];
 const nodes=inputs.map(value=>new MockText(` ${value} `,view.body));view.start();view.tick();assert.deepEqual(nodes.map(node=>node.nodeValue),expected.map(value=>` ${value} `));const unknown=new MockText(" unknown ",view.body);view.character(unknown);assert.equal(unknown.nodeValue," unknown ");
});
test("自身・祖先のdata-no-i18nと除外4tagを維持する", () => {
 const view=page("en");view.start();view.tick();for(const tag of ["SCRIPT","STYLE","TEXTAREA","OPTION"]){const node=new MockText(japanese[0],new MockElement(tag));view.character(node);assert.equal(node.nodeValue,japanese[0]);}const ancestor=new MockElement(),parent=new MockElement();ancestor.noI18n=true;parent.parentElement=ancestor;ancestor.children.push(parent);const node=new MockText(japanese[0],parent);view.character(node);assert.equal(node.nodeValue,japanese[0]);ancestor.noI18n=false;view.character(node);assert.equal(node.nodeValue,english[0]);
});
test("characterData・追加Textは直接、追加Elementは配下を変換する", () => {
 const view=page("en");view.start();view.tick();const parent=new MockElement(),node=new MockText(japanese[0],parent),sibling=new MockText(japanese[1],parent),added=new MockElement(),nested=new MockText(japanese[2],added);view.mutate(node,added);assert.equal(node.nodeValue,english[0]);assert.equal(sibling.nodeValue,japanese[1]);assert.equal(nested.nodeValue,english[2]);view.character(sibling);assert.equal(sibling.nodeValue,english[1]);assert.deepEqual(view.roots,[view.body,added]);
});
test("日時整形はRAFだけで有効日付を整形し、NaN日付と通知時の属性を保持する", () => {
 const view=page("en"),valid=new MockElement("TIME"),invalid=new MockElement("TIME");valid.dataset.localTime="2026-10-11T00:00:00Z";invalid.dataset.localTime="invalid";view.dates.push(valid,invalid);view.start();view.tick();assert.equal(valid.textContent,"2026-10-11T00:00:00.000Z (Local time · Asia/Tokyo / GMT+9)");assert.equal(invalid.textContent,"untouched");assert.deepEqual(view.dateTrace,["zone","query","parts","format"]);valid.textContent="later";view.mutate(valid);view.character(new MockText(japanese[0],view.body));assert.equal(valid.textContent,"later");assert.deepEqual(view.dateTrace,["zone","query","parts","format"]);
});
test("空DOM・孤立Node・空とnullの既存変換を保持する", () => {
 const view=page("en");view.start();view.tick();const orphan=new MockText(japanese[0],null);view.character(orphan);assert.equal(orphan.nodeValue,japanese[0]);const empty=new MockText("",view.body),nullNode=new MockText(null,view.body);view.character(empty);view.character(nullNode);assert.equal(empty.nodeValue,"");assert.equal(nullNode.nodeValue,"");
});

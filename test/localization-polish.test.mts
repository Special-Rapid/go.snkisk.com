import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { localizationPolishCode } from "../src/localization-polish-script.ts";

class ElementMock {
  children: (ElementMock | TextMock)[] = [];
  zones: { textContent: string | null }[] = [];
  tagName: string;
  constructor(tagName = "DIV") { this.tagName = tagName; }
  querySelectorAll(selector: string) { assert.equal(selector, "[data-time-zone-for]"); return this.zones; }
}
class TextMock {
  nodeType = 3;
  nodeValue: string | null;
  parentElement: ElementMock | null;
  constructor(nodeValue: string | null, parentElement: ElementMock | null) { this.nodeValue = nodeValue; this.parentElement = parentElement; parentElement?.children.push(this); }
}
type RecordMock = { type: string; target: TextMock; addedNodes: (TextMock | ElementMock | { nodeType: number })[] };
function page(lang = "en", host = "sinkaisoku.com") {
  const body = new ElementMock("BODY"), traces: string[] = [];
  let observer: ((records: RecordMock[]) => void) | undefined;
  const document = { documentElement: { lang }, body, title: "題名 - " + host,
    createTreeWalker(root: ElementMock, filter: number) { assert.equal(filter, 4); traces.push("walk"); const nodes: TextMock[] = []; function collect(e: ElementMock) { for (const c of e.children) c instanceof TextMock ? nodes.push(c) : collect(c); } collect(root); let index = 0; return { currentNode: nodes[0], nextNode() { this.currentNode = nodes[index++]; return this.currentNode !== undefined; } }; },
  };
  const window: { goTranslateText?: (text: string) => string } = {};
  return { body, document, window, traces,
    start() { runInNewContext(localizationPolishCode.replace("___GO_LOCALIZATION_POLISH_SERVICE_HOST___", host), { document, window, Element: ElementMock, Node: { TEXT_NODE: 3 }, NodeFilter: { SHOW_TEXT: 4 }, MutationObserver: class { constructor(fn: (records: RecordMock[]) => void) { observer = fn; traces.push("observer"); } observe(root: ElementMock, options: object) { assert.equal(root, body); assert.deepEqual(JSON.parse(JSON.stringify(options)), { subtree: true, childList: true, characterData: true }); traces.push("observe"); } } }); },
    mutate(records: RecordMock[]) { assert(observer); observer(records); },
  };
}

test("en以外はwalkもobserverも実行しない", () => { for (const lang of ["ja", "fr", "en-US", ""]) { const p = page(lang), t = new TextMock("更新すると利用回数はリセットされます。", p.body); p.start(); assert.equal(t.nodeValue, "更新すると利用回数はリセットされます。"); assert.deepEqual(p.traces, []); assert.equal(p.document.title, "題名 - sinkaisoku.com"); } });
test("初期walkは文言を翻訳し外側空白を保持する", () => { const p = page(), t = new TextMock(" 更新すると利用回数はリセットされます。\n", p.body), unknown = new TextMock(" unknown ", p.body); p.start(); assert.equal(t.nodeValue, " Saving resets the usage count.\n"); assert.equal(unknown.nodeValue, " unknown "); assert.deepEqual(p.traces, ["walk", "observer", "observe"]); });
test("除外4tagと孤立・null・空textを保持する", () => { const p = page(), texts = ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"].map(tag => { const parent = new ElementMock(tag); p.body.children.push(parent); return new TextMock("更新すると利用回数はリセットされます。", parent); }), orphan = new TextMock("更新すると利用回数はリセットされます。", null); p.body.children.push(orphan); const nil = new TextMock(null, p.body), empty = new TextMock("", p.body); p.start(); for (const t of [...texts, orphan]) assert.equal(t.nodeValue, "更新すると利用回数はリセットされます。"); assert.equal(nil.nodeValue, null); assert.equal(empty.nodeValue, ""); });
test("zoneは一致だけ整形しtitleはhostとcallback fallbackを保持する", () => { for (const host of ["sinkaisoku.com", "go.snkisk.com"]) { const p = page("en", host); p.body.zones.push({ textContent: "Asia/Tokyo / GMT+09:00" }, { textContent: "unknown" }); p.window.goTranslateText = text => text === "題名" ? "Title" : text; p.start(); assert.equal(p.body.zones[0].textContent, "Times are shown and entered in your local time (Asia/Tokyo / GMT+09:00)."); assert.equal(p.body.zones[1].textContent, "unknown"); assert.equal(p.document.title, "Title - " + host); } const p = page(); p.window.goTranslateText = () => ""; p.start(); assert.equal(p.document.title, "題名 - sinkaisoku.com"); });
test("mutationのText・Elementを処理し最後にbodyを再走査する", () => { const p = page(); p.start(); const t = new TextMock("更新すると利用回数はリセットされます。", p.body), branch = new ElementMock(), b = new TextMock("更新すると利用回数はリセットされます。", branch); p.body.children.push(branch); p.mutate([{ type: "characterData", target: t, addedNodes: [] }, { type: "childList", target: t, addedNodes: [branch, { nodeType: 8 }] }]); assert.equal(t.nodeValue, "Saving resets the usage count."); assert.equal(b.nodeValue, "Saving resets the usage count."); assert.deepEqual(p.traces, ["walk", "observer", "observe", "walk", "walk"]); p.document.documentElement.lang = "ja"; t.nodeValue = "更新すると利用回数はリセットされます。"; p.mutate([{ type: "characterData", target: t, addedNodes: [] }]); assert.equal(t.nodeValue, "Saving resets the usage count."); });
test("title不一致はcallbackを呼ばずcallback例外はobserver前に伝播する", () => { const p = page(); p.document.title = "unrelated"; p.window.goTranslateText = () => { throw new Error("unexpected"); }; p.start(); assert.equal(p.document.title, "unrelated"); const q = page(); q.window.goTranslateText = () => { throw new Error("translation failed"); }; assert.throws(() => q.start(), /translation failed/); assert.deepEqual(q.traces, ["walk"]); });

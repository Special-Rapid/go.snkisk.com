import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { themeBootstrapCode } from "../src/theme-bootstrap-script.ts";

function bootstrap(saved: unknown, fail = false, unavailable = false) {
  const trace: unknown[][] = [];
  const documentElement = {
    dataset: new Proxy({ theme: "previous" }, { set(target, key, value) { trace.push(["dataset", key, value]); return Reflect.set(target, key, value); } }),
    style: new Proxy({ colorScheme: "previous" }, { set(target, key, value) { trace.push(["style", key, value]); return Reflect.set(target, key, value); } }),
  };
  const context = {
    document: { documentElement },
    ...(unavailable ? {} : { localStorage: { getItem(key: string) { trace.push(["read", key]); if (fail) throw new Error("storage unavailable"); return saved; } } }),
  };
  runInNewContext(themeBootstrapCode, context);
  return { trace, documentElement };
}

test("保存されたテーマを同期で1回読み、DOMへ元の順序で適用する", () => {
  for (const theme of ["light", "dark", "auto"]) {
    const view = bootstrap(theme);
    assert.deepEqual(view.trace, [["read", "go_theme"], ["dataset", "theme", theme], ["style", "colorScheme", theme === "auto" ? "light dark" : theme]]);
  }
});

test("欠落や無効な保存値はautoとして適用し、storageへ書き戻さない", () => {
  for (const saved of [null, undefined, "", "system", "Light", "ja", 0, {}, ["dark"]]) {
    const view = bootstrap(saved);
    assert.equal(view.documentElement.dataset.theme, "auto");
    assert.equal(view.documentElement.style.colorScheme, "light dark");
    assert.equal(view.trace.length, 3);
  }
});

test("storageの読取例外やAPI不在でも共通画面の初期化を止めない", () => {
  for (const unavailable of [false, true]) {
    const view = bootstrap("dark", true, unavailable);
    assert.equal(view.documentElement.dataset.theme, "auto");
    assert.equal(view.documentElement.style.colorScheme, "light dark");
    assert.deepEqual(view.trace.slice(-2), [["dataset", "theme", "auto"], ["style", "colorScheme", "light dark"]]);
  }
});

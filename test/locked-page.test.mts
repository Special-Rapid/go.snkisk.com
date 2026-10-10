import assert from "node:assert/strict";
import test from "node:test";
import { createContext, runInContext } from "node:vm";
import { lockedPageScript } from "../src/locked-page-script.ts";

function page(deadline: string | undefined, missing?: "input" | "status") {
  let now = 1000;
  let sequence = 0;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const redirects: string[] = [];
  class Input {
    checked = false;
    dataset = { unlockAtMs: deadline };
    listener: (() => void) | undefined;
    addEventListener(event: string, listener: () => void) {
      assert.equal(event, "change");
      this.listener = listener;
    }
  }
  const input = new Input();
  const status = { textContent: "" };
  const href = "https://example.test/locked?entry=1#anchor";
  runInContext(lockedPageScript, createContext({
    HTMLInputElement: Input,
    document: { querySelector(selector: string) {
      if (selector === "#open_when_unlocked") return missing === "input" ? null : input;
      assert.equal(selector, "#open_when_unlocked_status");
      return missing === "status" ? null : status;
    } },
    Date: { now: () => now },
    clearTimeout(id: number | undefined) { if (id !== undefined) timers.delete(id); },
    window: {
      location: { href, replace: (url: string) => { redirects.push(url); } },
      setTimeout(callback: () => void, delay: number) {
        const id = ++sequence;
        timers.set(id, { callback, delay });
        return id;
      },
    },
  }));
  return { input, status, timers, redirects, href,
    change(checked: boolean) { input.checked = checked; input.listener?.(); },
    fire(time: number) {
      now = time;
      const entry = timers.entries().next().value;
      if (!entry) throw new Error("予約timerがありません。");
      timers.delete(entry[0]);
      entry[1].callback();
    },
  };
}

test("未選択では自動遷移を予約せず、選択後は残り時間を待つ", () => {
  const view = page("1500");
  assert.equal(view.timers.size, 0);
  assert.equal(view.redirects.length, 0);
  view.change(true);
  assert.equal(view.timers.values().next().value?.delay, 500);
  assert.equal(view.status.textContent, "公開時刻になったら自動的に開きます。");
});

test("長い待機は60秒上限で再判定し、繰返し選択でも予約は1件", () => {
  const view = page("90000");
  view.change(true);
  view.change(true);
  assert.equal(view.timers.size, 1);
  assert.equal(view.timers.values().next().value?.delay, 60000);
  view.fire(2000);
  assert.equal(view.timers.size, 1);
  assert.equal(view.timers.values().next().value?.delay, 60000);
});

test("解除は予約と待機表示を消す", () => {
  const view = page("90000");
  view.change(true);
  view.change(false);
  assert.equal(view.timers.size, 0);
  assert.equal(view.status.textContent, "");
  assert.equal(view.redirects.length, 0);
});

test("時刻の不正・欠落・無限値は遷移せず確認失敗を表示する", () => {
  for (const value of ["not-a-date", undefined, "Infinity"]) {
    const view = page(value);
    view.change(true);
    assert.equal(view.status.textContent, "公開時刻を確認できません。");
    assert.equal(view.timers.size, 0);
    assert.equal(view.redirects.length, 0);
  }
});

test("公開時刻到達・経過後はqueryとfragmentを含む同じURLを開く", () => {
  for (const value of ["999", "1000"]) {
    const view = page(value);
    view.change(true);
    assert.deepEqual(view.redirects, [view.href]);
    assert.equal(view.timers.size, 0);
  }
  const waiting = page("1500");
  waiting.change(true);
  waiting.fire(1500);
  assert.deepEqual(waiting.redirects, [waiting.href]);
  assert.equal(waiting.timers.size, 0);
});

test("必要なDOMがない場合はlistenerと予約を作らない", () => {
  for (const missing of ["input", "status"] as const) {
    const view = page("1500", missing);
    assert.equal(view.input.listener, undefined);
    view.change(true);
    assert.equal(view.timers.size, 0);
    assert.equal(view.redirects.length, 0);
  }
});

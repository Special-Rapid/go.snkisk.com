(() => {
  const form = document.querySelector<HTMLFormElement>("form[data-admin-filter]");
  const results = document.querySelector<HTMLElement>("[data-admin-results]");
  const status = document.querySelector<HTMLElement>("[data-admin-filter-status]");
  const query = form?.querySelector<HTMLInputElement>("#q");
  const state = form?.querySelector<HTMLSelectElement>("#state");
  if (!form || !results || !status || !query || !state) return;
  let generation = 0, timer: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined;
  let composing = false;
  const invalidate = () => { generation++; clearTimeout(timer); controller?.abort(); };
  const update = async () => {
    const current = generation;
    const url = new URL(form.action);
    url.search = new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
    controller = new AbortController();
    status.textContent = "検索中…";
    results.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(url, { credentials: "same-origin", signal: controller.signal });
      if (!response.ok || response.redirected) throw new Error("Search failed");
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const next = doc.querySelector<HTMLElement>("[data-admin-results]");
      if (!next) throw new Error("Missing results");
      if (current !== generation) return;
      results.replaceChildren(...Array.from(next.childNodes).map(node => document.importNode(node, true)));
      history.replaceState(null, "", url.pathname + url.search);
      status.textContent = "検索結果を更新しました。";
    } catch (error) {
      if (current !== generation) return;
      status.textContent = "自動更新できませんでした。絞り込むボタンで再試行してください。";
    } finally {
      if (current === generation) results.removeAttribute("aria-busy");
    }
  };
  const schedule = (delay: number) => { invalidate(); timer = setTimeout(() => void update(), delay); };
  query.addEventListener("compositionstart", () => { composing = true; invalidate(); });
  query.addEventListener("compositionend", () => { composing = false; schedule(350); });
  query.addEventListener("input", () => { if (!composing) schedule(350); });
  state.addEventListener("change", () => schedule(0));
  window.addEventListener("popstate", () => {
    const url = new URL(location.href);
    query.value = url.searchParams.get("q") || "";
    state.value = url.searchParams.get("state") || "all";
    schedule(0);
  });
})();

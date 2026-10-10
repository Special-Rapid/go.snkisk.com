(() => {
  if (document.documentElement.lang !== "en") return;
  const words: Record<string, string | undefined> = {
    "有効期限（任意）": "Expiration (optional)",
    "リンク終了時の表示（任意）": "End display (optional)",
    "終了メッセージ": "End message",
    "入力・表示はお使いの端末の現地時間です。JavaScriptを無効にしている場合はUTCとして扱います。": "Times are shown and entered in your local time. With JavaScript disabled, UTC is used.",
  };
  const scan = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes: Node[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"].includes(parent.tagName)) continue;
      const value = node.nodeValue || "", trimmed = value.trim(), next = words[trimmed];
      if (next) node.nodeValue = value.slice(0, value.indexOf(trimmed)) + next + value.slice(value.indexOf(trimmed) + trimmed.length);
    }
  };
  requestAnimationFrame(() => scan(document.body));
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) scan(node.parentElement);
      else if (node instanceof Element) scan(node);
    }
  }).observe(document.body, { subtree: true, childList: true });
})();

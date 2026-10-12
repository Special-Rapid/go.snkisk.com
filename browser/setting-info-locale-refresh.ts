(() => {
  document.addEventListener("DOMContentLoaded", () => {
    for (const toggle of document.querySelectorAll("[data-condition-toggle]")) {
      if (toggle instanceof HTMLInputElement) toggle.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (document.documentElement.lang !== "en") return;
    const studio = document.querySelector(".create-studio");
    if (!(studio instanceof HTMLElement)) return;
    const exact: Record<string, string | undefined> = {
      "英数字、ハイフン、アンダースコア。未入力なら自動生成します。": "Use letters, numbers, hyphens, and underscores. Leave blank to generate one.",
      "作成される短縮URL": "Your short URL",
      "リンクを終了": "End the link",
      "選択した方法で設定します。": "Choose how to set the social preview.",
      "転送先の切替を設定中は、SNSプレビューは利用できません。": "Social previews are unavailable while destination switching is set.",
    };
    const walker = document.createTreeWalker(studio, NodeFilter.SHOW_TEXT);
    const nodes: Node[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"].includes(parent.tagName)) continue;
      const original = node.nodeValue || "", trimmed = original.trim(), translated = exact[trimmed];
      if (translated) node.nodeValue = original.replace(trimmed, translated);
    }
  }, { once: true });
})();

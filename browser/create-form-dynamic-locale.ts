(() => {
  if (document.documentElement.lang !== "en") return;
  const words: Record<string, string | undefined> = {
    "指定日時以降の転送先URL": "Destination from the selected time",
    "SNSプレビューは付けません。": "No social preview is added.",
    "保存時に転送先ページからSNSプレビュー情報を取得します。": "The preview is imported from the destination when you save.",
    "アクセス時点の転送先URLをSNSプレビューに表示します。": "The destination URL at the time of access is shown in the social preview.",
    "タイトルと説明を入力してください。": "Enter a title and description.",
  };
  const convert = (node: Node) => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "TEXTAREA", "OPTION"].includes(parent.tagName)) return;
    const value = node.nodeValue || "", trimmed = value.trim(), next = words[trimmed];
    if (next) node.nodeValue = value.slice(0, value.indexOf(trimmed)) + next + value.slice(value.indexOf(trimmed) + trimmed.length);
  };
  const scan = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes: Node[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(convert);
  };
  requestAnimationFrame(() => scan(document.body));
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "characterData") convert(record.target);
      else record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) convert(node);
        else if (node instanceof Element) scan(node);
      });
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
})();

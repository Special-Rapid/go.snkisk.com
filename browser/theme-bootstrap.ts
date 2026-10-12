(() => {
  const key = "go_theme";
  let theme: "auto" | "light" | "dark" = "auto";
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark" || saved === "auto") theme = saved;
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "auto" ? "light dark" : theme;
})();

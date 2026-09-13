const SERVICE_ORIGIN = "https://go.snkisk.com";
const copy = {
  ja: { loading: "短縮URLを作成中…", sourceLabel: "短縮するURL", shortLabel: "短縮URL", copy: "コピー", copied: "コピーしました", retry: "このURLで作り直す", manage: "管理URLを開く", invalid: "このページのURLは短縮できません。URLを入力して作り直してください。", failed: "作成できませんでした。もう一度お試しください。", verifying: "安全確認中…", light: "ライトテーマ", system: "システムテーマ", dark: "ダークテーマ" },
  en: { loading: "Creating your short URL…", sourceLabel: "URL to shorten", shortLabel: "Short URL", copy: "Copy", copied: "Copied", retry: "Create again with this URL", manage: "Open management URL", invalid: "This page cannot be shortened. Enter a URL and try again.", failed: "Could not create the short URL. Please try again.", verifying: "Verifying…", light: "Light theme", system: "System theme", dark: "Dark theme" },
};
let locale = "ja";
let theme = "system";
let pendingUrl = "";
let bridgeReady = false;
let submitted = false;
const status = document.querySelector("#status");
const sourceUrl = document.querySelector("#source-url");
const result = document.querySelector("#result");
const shortUrl = document.querySelector("#short-url");
const copyButton = document.querySelector("#copy");
const retry = document.querySelector("#retry");
const bridge = document.querySelector("#bridge");
const qr = document.querySelector("#qr");
const manage = document.querySelector("#manage");
const text = (key) => copy[locale][key];
function setStatus(message) { status.textContent = message; }
function applyLocale() {
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-locale]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locale === locale)));
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = text(element.dataset.i18n); });
}
function applyTheme() {
  document.body.dataset.theme = theme;
  const resolvedDark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolvedDark ? "#1d1713" : "#fffaf4");
  document.querySelectorAll("button[data-theme]").forEach((button) => {
    const selected = button.dataset.theme === theme;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", copy[locale][button.dataset.theme]);
  });
}
async function loadPreferences() { try { return await chrome.storage.local.get({ popupLocale: "ja", popupTheme: "system" }); } catch { return { popupLocale: "ja", popupTheme: "system" }; } }
async function savePreferences(values) { try { await chrome.storage.local.set(values); } catch { /* The popup remains usable when extension storage is unavailable. */ } }
function isWebUrl(value) { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
function requestCreation() {
  pendingUrl = sourceUrl.value.trim();
  result.hidden = true; retry.hidden = true; submitted = false;
  if (!isWebUrl(pendingUrl)) { setStatus(text("invalid")); retry.hidden = false; return; }
  setStatus(text("verifying"));
  if (bridgeReady) { bridgeReady = false; bridge.src = bridge.src; }
}
function submitToBridge() {
  if (!pendingUrl) return;
  bridge.contentWindow.postMessage({ source: "go-extension-popup", targetUrl: pendingUrl }, SERVICE_ORIGIN);
}
async function createWithToken(turnstileToken) {
  if (submitted || !turnstileToken) return;
  submitted = true; setStatus(text("loading"));
  try {
    const response = await fetch(`${SERVICE_ORIGIN}/extension/create`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetUrl: pendingUrl, turnstileToken }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : text("failed"));
    showCreated(payload);
  } catch (error) { showError(error instanceof Error ? error.message : text("failed")); }
}
function showError(message) { setStatus(message || text("failed")); retry.hidden = false; }
async function showCreated(payload) {
  if (typeof payload.shortUrl !== "string" || typeof payload.qrSvg !== "string") return showError();
  shortUrl.value = payload.shortUrl;
  qr.src = `data:image/svg+xml,${encodeURIComponent(payload.qrSvg)}`;
  qr.alt = locale === "en" ? "QR code for the romanized short URL" : "ローマ字の短縮URLを開くQRコード";
  manage.href = typeof payload.manageUrl === "string" ? payload.manageUrl : "#";
  await savePreferences({ [`manage:${payload.shortUrl}`]: payload.manageUrl });
  setStatus(""); result.hidden = false;
}
async function copyShortUrl() {
  try { await navigator.clipboard.writeText(shortUrl.value); copyButton.textContent = text("copied"); setTimeout(() => { copyButton.textContent = text("copy"); }, 1600); } catch { shortUrl.focus(); shortUrl.select(); document.execCommand("copy"); }
}
document.querySelectorAll("[data-locale]").forEach((button) => button.addEventListener("click", () => { locale = button.dataset.locale; applyLocale(); applyTheme(); savePreferences({ popupLocale: locale }); }));
document.querySelectorAll("button[data-theme]").forEach((button) => button.addEventListener("click", () => { theme = button.dataset.theme; applyTheme(); savePreferences({ popupTheme: theme }); }));
copyButton.addEventListener("click", copyShortUrl);
retry.addEventListener("click", requestCreation);
sourceUrl.addEventListener("change", requestCreation);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (theme === "system") applyTheme(); });
window.addEventListener("message", async (event) => {
  if (event.origin !== SERVICE_ORIGIN || event.source !== bridge.contentWindow || !event.data || event.data.source !== "go-extension-create") return;
  if (event.data.type === "ready") { bridgeReady = true; submitToBridge(); return; }
  if (event.data.type === "error") { showError(event.data.message); return; }
  if (event.data.type === "token" && event.data.targetUrl === pendingUrl && typeof event.data.turnstileToken === "string") createWithToken(event.data.turnstileToken);
});
(async () => {
  const preferences = await loadPreferences();
  locale = preferences.popupLocale === "en" ? "en" : "ja";
  theme = ["light", "dark", "system"].includes(preferences.popupTheme) ? preferences.popupTheme : "system";
  applyLocale();
  applyTheme();
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  sourceUrl.value = tab?.url || "";
  requestCreation();
})();

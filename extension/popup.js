const SERVICE_ORIGIN = "https://go.snkisk.com";
const copy = {
  ja: { loading: "短縮URLを作成中…", sourceLabel: "短縮するURL", shortLabel: "短縮URL", copy: "コピー", copied: "コピーしました", retry: "このURLで作り直す", configure: "go.snkisk.comで詳細に設定する", manage: "管理URLを開く", downloadQr: "QRコードを保存", downloadPng: "PNG", downloadJpg: "JPG", downloadSvg: "SVG", downloadFailed: "QRコードを保存できませんでした。", invalid: "このページのURLは短縮できません。URLを入力して作り直してください。", failed: "作成できませんでした。もう一度お試しください。", verifying: "安全確認中…", light: "ライトテーマ", system: "システムテーマ", dark: "ダークテーマ" },
  en: { loading: "Creating your short URL…", sourceLabel: "URL to shorten", shortLabel: "Short URL", copy: "Copy", copied: "Copied", retry: "Create again with this URL", configure: "Configure on go.snkisk.com", manage: "Open management URL", downloadQr: "Save QR code", downloadPng: "PNG", downloadJpg: "JPG", downloadSvg: "SVG", downloadFailed: "Could not save the QR code.", invalid: "This page cannot be shortened. Enter a URL and try again.", failed: "Could not create the short URL. Please try again.", verifying: "Verifying…", light: "Light theme", system: "System theme", dark: "Dark theme" },
};
let locale = "ja";
let theme = "system";
let pendingUrl = "";
let bridgeReady = false;
let submitted = false;
let qrSvg = "";
let statusKey = "loading";
const status = document.querySelector("#status");
const sourceUrl = document.querySelector("#source-url");
const result = document.querySelector("#result");
const shortUrl = document.querySelector("#short-url");
const copyButton = document.querySelector("#copy");
const retry = document.querySelector("#retry");
const bridge = document.querySelector("#bridge");
const qr = document.querySelector("#qr");
const configure = document.querySelector("#configure");
const manage = document.querySelector("#manage");
const downloadButtons = [...document.querySelectorAll("[data-qr-download]")];
const text = (key) => copy[locale][key];
function setStatus(message) { statusKey = ""; status.textContent = message; }
function setStatusKey(key) { statusKey = key; status.textContent = text(key); }
function applyLocale() {
  document.documentElement.lang = locale;
  document.querySelectorAll("[data-locale]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locale === locale)));
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = text(element.dataset.i18n); });
  if (statusKey) status.textContent = text(statusKey);
  document.querySelector(".qr-downloads")?.setAttribute("aria-label", text("downloadQr"));
  if (qr.src) qr.alt = locale === "en" ? "QR code for the romanized short URL" : "ローマ字の短縮URLを開くQRコード";
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
function requestCreation(force = false) {
  const nextUrl = sourceUrl.value.trim();
  if (!force && nextUrl === pendingUrl && (submitted || !result.hidden)) return;
  pendingUrl = nextUrl;
  result.hidden = true; retry.hidden = true; submitted = false;
  if (!isWebUrl(pendingUrl)) { setStatusKey("invalid"); retry.hidden = false; return; }
  setStatusKey("verifying");
  if (bridgeReady) { bridgeReady = false; bridge.src = bridge.src; }
}
function submitToBridge() {
  if (!pendingUrl) return;
  bridge.contentWindow.postMessage({ source: "go-extension-popup", targetUrl: pendingUrl }, SERVICE_ORIGIN);
}
async function createWithToken(turnstileToken) {
  if (submitted || !turnstileToken) return;
  submitted = true; setStatusKey("loading");
  try {
    const response = await fetch(`${SERVICE_ORIGIN}/extension/create`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetUrl: pendingUrl, turnstileToken }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : text("failed"));
    showCreated(payload);
  } catch (error) { showError(error instanceof Error ? error.message : text("failed")); }
}
function showError(message) { message ? setStatus(message) : setStatusKey("failed"); retry.hidden = false; }
async function showCreated(payload) {
  if (typeof payload.shortUrl !== "string" || typeof payload.qrSvg !== "string") return showError();
  shortUrl.value = payload.shortUrl;
  qrSvg = payload.qrSvg;
  qr.src = `data:image/svg+xml,${encodeURIComponent(qrSvg)}`;
  qr.alt = locale === "en" ? "QR code for the romanized short URL" : "ローマ字の短縮URLを開くQRコード";
  const configureUrl = new URL("/", SERVICE_ORIGIN);
  configureUrl.searchParams.set("target_url", pendingUrl);
  configure.href = configureUrl.href;
  manage.href = typeof payload.manageUrl === "string" ? payload.manageUrl : "#";
  await savePreferences({ [`manage:${payload.shortUrl}`]: payload.manageUrl });
  setStatus(""); result.hidden = false;
}
async function copyShortUrl() {
  try { await navigator.clipboard.writeText(shortUrl.value); copyButton.textContent = text("copied"); setTimeout(() => { copyButton.textContent = text("copy"); }, 1600); } catch { shortUrl.focus(); shortUrl.select(); document.execCommand("copy"); }
}
function qrFilename(format) {
  let slug = "short-url";
  try { slug = new URL(shortUrl.value).pathname.split("/").filter(Boolean).at(-1) || slug; } catch { /* Keep the safe fallback. */ }
  return `go-snkisk-${slug.replace(/[^a-zA-Z0-9_-]/g, "-")}-qr.${format}`;
}
function downloadBlob(blob, filename) {
  const anchor = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
function rasterizeQr(mimeType) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" }));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(sourceUrl); reject(new Error("canvas unavailable")); return; }
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(sourceUrl);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image encoding failed")), mimeType, mimeType === "image/jpeg" ? 0.95 : undefined);
    };
    image.onerror = () => { URL.revokeObjectURL(sourceUrl); reject(new Error("QR image unavailable")); };
    image.src = sourceUrl;
  });
}
async function downloadQr(event) {
  const button = event.currentTarget;
  const format = button.dataset.qrDownload;
  if (!qrSvg || !format) return;
  button.disabled = true;
  try {
    const blob = format === "svg"
      ? new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" })
      : await rasterizeQr(format === "jpg" ? "image/jpeg" : "image/png");
    downloadBlob(blob, qrFilename(format));
  } catch { setStatusKey("downloadFailed"); } finally { button.disabled = false; }
}
document.querySelectorAll("[data-locale]").forEach((button) => button.addEventListener("click", () => { locale = button.dataset.locale; applyLocale(); applyTheme(); savePreferences({ popupLocale: locale }); }));
document.querySelectorAll("button[data-theme]").forEach((button) => button.addEventListener("click", () => { theme = button.dataset.theme; applyTheme(); savePreferences({ popupTheme: theme }); }));
copyButton.addEventListener("click", copyShortUrl);
downloadButtons.forEach((button) => button.addEventListener("click", downloadQr));
retry.addEventListener("click", () => requestCreation(true));
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

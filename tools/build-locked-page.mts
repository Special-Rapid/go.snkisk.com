import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  throw new Error("usage: node tools/build-locked-page.mts [--check]");
}
const root = fileURLToPath(new URL("../", import.meta.url));
const configPath = join(root, "tsconfig.browser.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
  getCurrentDirectory: () => root, getCanonicalFileName: (name) => name, getNewLine: () => "\n",
}));
const entries = [
  { source: "locked-page-auto-open", target: "locked-page-script", symbol: "lockedPageScript" },
  { source: "create-preview-label", target: "create-preview-label-script", symbol: "createPreviewLabelScript" },
  { source: "create-service-guide-locale", target: "create-service-guide-locale-script", symbol: "createServiceGuideLocaleScript" },
  { source: "create-rule-heading-locale", target: "create-rule-heading-locale-script", symbol: "createRuleHeadingLocaleCode" },
  { source: "theme-bootstrap", target: "theme-bootstrap-script", symbol: "themeBootstrapCode" },
  { source: "create-form-terms-locale", target: "create-form-terms-locale-script", symbol: "createFormTermsLocaleCode" },
  { source: "setting-info-locale-refresh", target: "setting-info-locale-refresh-script", symbol: "settingInfoLocaleRefreshCode" },
  { source: "create-form-dynamic-locale", target: "create-form-dynamic-locale-script", symbol: "createFormDynamicLocaleCode" },
  { source: "home-polish-locale", target: "home-polish-locale-script", symbol: "homePolishLocaleCode" },
  { source: "entry-expiry-locale", target: "entry-expiry-locale-script", symbol: "entryExpiryLocaleCode" },
];
if (parsed.fileNames.length !== entries.length || parsed.fileNames.some((name, index) => resolve(name) !== join(root, `browser/${entries[index].source}.ts`))) {
  throw new Error("登録されたブラウザー用の指定sourceだけを生成できます。");
}
const temporary = await mkdtemp(join(tmpdir(), "go-locked-page-build-"));
try {
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: false, noEmitOnError: true, outDir: temporary });
  const emitted = program.emit();
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics];
  if (emitted.emitSkipped || diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root, getCanonicalFileName: (name) => name, getNewLine: () => "\n",
    }));
  }
  // 全出力を読み取ってから、固定の生成先だけを比較・更新する。
  const outputs = await Promise.all(entries.map(async (entry) => {
    const script = await readFile(join(temporary, `${entry.source}.js`), "utf8");
    return {
      generated: `// tools/build-locked-page.mtsの生成物。編集元はbrowser/${entry.source}.tsです。\nexport const ${entry.symbol} = ${JSON.stringify(script)};\n`,
      target: join(root, `src/${entry.target}.ts`),
    };
  }));
  for (const output of outputs) {
    if (args[0] === "--check") {
      if (output.generated !== await readFile(output.target, "utf8")) {
        throw new Error("埋込scriptの生成物が不一致です。npm run build:locked-pageで再生成してください。");
      }
    } else {
      await writeFile(output.target, output.generated);
    }
  }
  console.log(args[0] === "--check" ? "埋込script生成10件の一致PASS" : "埋込script10件を生成しました。");
} finally {
  await rm(temporary, { recursive: true, force: true });
}

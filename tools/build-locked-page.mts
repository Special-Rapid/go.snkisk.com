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
if (parsed.fileNames.length !== 1 || resolve(parsed.fileNames[0]) !== join(root, "browser/locked-page-auto-open.ts")) {
  throw new Error("公開前リンク用の指定sourceだけを生成できます。");
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
  const script = await readFile(join(temporary, "locked-page-auto-open.js"), "utf8");
  const generated = `// tools/build-locked-page.mtsの生成物。編集元はbrowser/locked-page-auto-open.tsです。\nexport const lockedPageScript = ${JSON.stringify(script)};\n`;
  const target = join(root, "src/locked-page-script.ts");
  if (args[0] === "--check") {
    if (generated !== await readFile(target, "utf8")) {
      throw new Error("公開前リンクの生成物が不一致です。npm run build:locked-pageで再生成してください。");
    }
    console.log("公開前リンクの生成物一致PASS");
  } else {
    await writeFile(target, generated);
    console.log("公開前リンク用scriptを生成しました。");
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}

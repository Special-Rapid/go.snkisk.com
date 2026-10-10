import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// 同じcompiler設定で生成し、Chromeが読む追跡済みJSの一致を確認する。
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  throw new Error("usage: node tools/build-extension.mts [--check]");
}
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(join(tmpdir(), "go-extension-build-"));
try {
  const compile = spawnSync(process.execPath, [
    join(projectRoot, "node_modules/typescript/bin/tsc"),
    "-p", join(projectRoot, "tsconfig.extension.json"), "--outDir", output,
  ], { cwd: projectRoot, stdio: "inherit" });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) throw new Error("popup TypeScript compilation failed");
  const generated = readFileSync(join(output, "popup.js"));
  const target = join(projectRoot, "extension/popup.js");
  if (args[0] === "--check") {
    if (!generated.equals(readFileSync(target))) {
      throw new Error("popup.js differs from popup.ts; run npm run build:extension");
    }
    console.log("popup.js matches the TypeScript source");
  } else {
    writeFileSync(target, generated);
    console.log("generated extension/popup.js");
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}

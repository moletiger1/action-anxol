#!/usr/bin/env node
// TEST-06: 再現可能な検証手順。
// 各チェックを個別プロセスで実行し、結果を「分離して」表示する。既知の失敗を成功として隠さない
// （1件でも失敗すれば終了コード1。途中で打ち切らず全部実行する）。
//
// 対象は package.json の engines に合わせて Node.js 24.x。
//   nvm use 24 && npm run verify
//
// 使い方:
//   node scripts/verify.mjs                 すべて実行
//   node scripts/verify.mjs tests lint:all  指定したIDだけ実行
//   node scripts/verify.mjs --list          IDの一覧
//   node scripts/verify.mjs --quiet         各チェックの生ログを出さず要約のみ
//   node scripts/verify.mjs --skip-build    ビルドを除外（時間短縮）
//
// 依存パッケージは追加しない（Node標準のみ）。認証DB・ブラウザー・稼働サーバーは不要。

import { spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const nodeMajor = Number(process.versions.node.split(".")[0]);
const REQUIRED_MAJOR = 24;

const argv = process.argv.slice(2);
const quiet = argv.includes("--quiet");
const skipBuild = argv.includes("--skip-build");
const filters = argv.filter(a => !a.startsWith("--"));

function testFiles(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter(f => f.endsWith(".test.mjs")).sort().map(f => join(dir, f));
}
const testArgs = [...testFiles("scripts/backend-contracts"), ...testFiles("scripts/workflows")];

const CHECKS = [
  { id: "runtime", desc: `実行Nodeが${REQUIRED_MAJOR}.x（engines準拠）`, runtime: true },
  { id: "yen", desc: "円の整数入力・予算/返金例（scripts/check-yen.mjs）", cmd: node, args: ["scripts/check-yen.mjs"] },
  { id: "tests", desc: `アプリコード試験（${testArgs.length}ファイル）`, cmd: node, args: ["--test", ...testArgs], parseTests: true },
  { id: "typegen", desc: "Next.jsの型生成（next typegen、クリーンチェックアウト用）", cmd: node, args: ["node_modules/next/dist/bin/next", "typegen"], env: { NEXT_TELEMETRY_DISABLED: "1" } },
  { id: "typecheck", desc: "型検証（tsc --noEmit）", cmd: node, args: ["node_modules/typescript/bin/tsc", "--noEmit"] },
  { id: "lint:target", desc: "対象lint（P1範囲）", cmd: node, args: ["node_modules/eslint/bin/eslint.js", "src/domain/operational", "src/server/ports", "scripts/backend-contracts"] },
  { id: "lint:all", desc: "全体lint（eslint .）", cmd: node, args: ["node_modules/eslint/bin/eslint.js", "."] },
  { id: "build", desc: "本番ビルド（next build）", cmd: node, args: ["node_modules/next/dist/bin/next", "build"], env: { NEXT_TELEMETRY_DISABLED: "1" } },
];

if (argv.includes("--list")) {
  console.log(`実行可能なID（Node ${process.versions.node}、作業ディレクトリ ${root}）:`);
  CHECKS.forEach(c => console.log(`  ${c.id.padEnd(12)} ${c.desc}`));
  process.exit(0);
}

let selected = CHECKS;
if (filters.length) {
  selected = CHECKS.filter(c => filters.includes(c.id));
  const unknown = filters.filter(f => !CHECKS.some(c => c.id === f));
  if (unknown.length) { console.error(`不明なID: ${unknown.join(", ")}`); process.exit(2); }
}
if (skipBuild) selected = selected.filter(c => c.id !== "build");

console.log(`# 検証手順（再現用）`);
console.log(`  node     : ${process.version}`);
console.log(`  npm      : ${process.env.npm_config_user_agent ?? "(unknown)"}`);
console.log(`  platform : ${process.platform} ${process.arch}`);
console.log(`   root    : ${root}`);
console.log(`  checks   : ${selected.map(c => c.id).join(", ")}`);
console.log("");

const results = [];
for (const check of selected) {
  console.log(`── ${check.id}: ${check.desc} ──`);
  const started = Date.now();

  if (check.runtime) {
    const ok = nodeMajor === REQUIRED_MAJOR;
    console.log(ok
      ? `OK: Node ${process.version} は engines (${REQUIRED_MAJOR}.x) を満たす`
      : `NG: Node ${process.version} は engines (${REQUIRED_MAJOR}.x) を満たさない。\`nvm install ${REQUIRED_MAJOR} && nvm use ${REQUIRED_MAJOR}\` で実行してください（Node ${nodeMajor}での成功を${REQUIRED_MAJOR}の成功として扱わない）`);
    results.push({ id: check.id, ok, ms: Date.now() - started, detail: `node ${process.version}` });
    console.log("");
    continue;
  }

  const res = spawnSync(check.cmd, check.args, {
    cwd: root,
    env: { ...process.env, ...(check.env ?? {}) },
    encoding: "utf8",
  });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  if (!quiet && out) process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);

  let ok = !res.error && res.status === 0;
  let detail = res.error ? `spawn error: ${res.error.message}` : `exit ${res.status}`;

  if (check.parseTests) {
    const pass = Number((out.match(/^\s*ℹ?\s*pass (\d+)/m) ?? [])[1]);
    const fail = Number((out.match(/^\s*ℹ?\s*fail (\d+)/m) ?? [])[1]);
    const skipped = Number((out.match(/^\s*ℹ?\s*skipped (\d+)/m) ?? [])[1]);
    if (Number.isFinite(pass)) {
      detail = `pass ${pass} / fail ${Number.isFinite(fail) ? fail : "?"} / skip ${Number.isFinite(skipped) ? skipped : "?"}`;
      ok = ok && fail === 0;
    }
  }

  results.push({ id: check.id, ok, ms: Date.now() - started, detail });
  console.log("");
}

console.log("## 結果");
const failed = results.filter(r => !r.ok);
for (const r of results) {
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.id.padEnd(12)} ${String(r.ms).padStart(6)}ms  ${r.detail}`);
}
console.log("");
if (failed.length) {
  console.log(`失敗: ${failed.length}件（${failed.map(f => f.id).join(", ")}）`);
  process.exit(1);
}
console.log(`すべて成功（${results.length}件、Node ${process.version}）`);

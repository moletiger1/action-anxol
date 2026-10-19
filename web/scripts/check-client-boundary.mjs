#!/usr/bin/env node
// DEV-07: server/client 境界の negative 検証。
//
// 1) 実ビルド出力の走査
//    ブラウザーへ配信される資産（.next/static/** と .next/server/app/**/*.{html,rsc}）に、
//    サーバー専用モジュール／秘密の識別子が混入していないことを確認する。
//    各 marker は「ソース側に存在する（対照）」と「配信物に無い」の両方を確認するため、
//    marker 名を変えるだけで空振り合格することはない。さらに、配信物にサーバー描画の
//    文字列（root layout の title）が実在することも確認し、走査対象の空振りを検出する。
//    なお .next/cache・.next/turbopack・.next/dev は配信物ではないので対象外。
//
// 2) 実 next build による拒否の確認（negative control）
//    最小 fixture（client component が server-only モジュールを import）を、このリポジトリの
//    Next で実際に build し、クライアント境界で拒否される（build が失敗する）ことを確認する。
//    build が成功してしまったら不合格。
//
// 3) サーバー専用モジュールの明示ガード
//    秘密を扱うモジュールが `import 'server-only'` を宣言していることを確認する。
//    これが無いと、client component からの誤った import が「Firestore SDK の
//    child_process が解決できない」等の間接的なエラーで止まるだけで、SDK を差し替えると
//    境界が黙って開く（実測: 2026-10 の probe で 46エラー/child_process だった）。
//
// 前提: `next build` 済み（.next/static が存在すること）。
//
// 使い方:
//   node scripts/check-client-boundary.mjs
//   node scripts/check-client-boundary.mjs --skip-negative-build
//   node scripts/check-client-boundary.mjs --keep-fixture
//   node scripts/check-client-boundary.mjs --list
//
// 依存パッケージは追加しない（Node標準のみ）。

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const argv = process.argv.slice(2);
const skipNegative = argv.includes("--skip-negative-build");
const keepFixture = argv.includes("--keep-fixture");

// marker: 値、および「その値が実在することを確認するソース（対照）」
const MARKERS = [
  { name: "AUTH_COOKIE", value: "__Host-demo-auth", control: "src/lib/auth.server.ts" },
  { name: "rate-limit error", value: "Authentication rate limit storage is not configured", control: "src/lib/auth.server.ts" },
  { name: "AUTH_FIRESTORE_PROJECT_ID", value: "AUTH_FIRESTORE_PROJECT_ID", control: "src/lib/auth.server.ts" },
  { name: "createHmac", value: "createHmac", control: "src/lib/auth.server.ts" },
  { name: "Firestore SDK", value: "@google-cloud/firestore", control: "src/lib/auth.server.ts" },
  { name: "AUTH_SESSION_SECRET", value: "AUTH_SESSION_SECRET", control: "src/proxy.ts" },
  { name: "BASIC_AUTH_PASSWORD", value: "BASIC_AUTH_PASSWORD", control: "src/proxy.ts" },
  { name: "BASIC_AUTH_USERNAME", value: "BASIC_AUTH_USERNAME", control: "src/proxy.ts" },
  { name: "closed port code", value: "PRODUCTION_PORT_UNAVAILABLE", control: "src/server/ports/closed.ts" },
  { name: "closed capabilities", value: "UNCONFIGURED_CAPABILITIES", control: "src/server/ports/closed.ts" },
  // Next が client 層で server-only を解決する際の実体（この文言が出れば境界が破れている）
  { name: "server-only guard", value: "This module cannot be imported from a Client Component", control: "node_modules/next/dist/compiled/server-only/index.js" },
];

// 走査対象が空振りしていないことの健全性確認：
// root layout の title（サーバー描画）が配信物の html に実在すること。
// これが無いと「ファイルは読めたが中身が想定と違う」場合に合格してしまう。
const SANITY = { name: "server-rendered title", source: "src/app/layout.tsx", pattern: /title:\s*"([^"]+)"/ };

// 秘密／サーバー専用のモジュールは `import 'server-only'` を明示宣言していること。
const GUARDED_MODULES = ["src/lib/auth.server.ts", "src/server/ports/closed.ts"];

if (argv.includes("--list")) {
  console.log(`marker ${MARKERS.length}件（対照のソース付き）:`);
  for (const m of MARKERS) console.log(`  ${m.name.padEnd(24)} ${m.control}`);
  process.exit(0);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function filesContaining(files, needle) {
  const hits = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    if (text.includes(needle)) hits.push(relative(root, f));
  }
  return hits;
}

const failures = [];
const say = (line) => console.log(line);

say("# DEV-07: server/client 境界の negative 検証");
say(`  node : ${process.version}`);

// ── 1. 実ビルド出力の走査 ──────────────────────────────────────────────
say("");
say("## 1. 実ビルド出力の走査");
const staticDir = join(root, ".next", "static");
if (!existsSync(staticDir)) {
  console.log(`NG: ${relative(root, staticDir)} がありません。先に \`next build\` を実行してください。`);
  process.exit(1);
}

const clientFiles = walk(staticDir);
const appDir = join(root, ".next", "server", "app");
const payloadFiles = walk(appDir).filter((f) => /\.(html|rsc)$/.test(f));
const delivered = [...clientFiles, ...payloadFiles];
const deliveredBytes = delivered.reduce((n, f) => n + statSync(f).size, 0);
say(`  走査対象: .next/static（${clientFiles.length}ファイル）＋ .next/server/app の html/rsc（${payloadFiles.length}ファイル）、計 ${(deliveredBytes / 1024 / 1024).toFixed(1)}MB`);

for (const m of MARKERS) {
  const controlPath = join(root, m.control);
  let controlOk = false;
  try { controlOk = readFileSync(controlPath, "utf8").includes(m.value); } catch { controlOk = false; }
  const hits = filesContaining(delivered, m.value);
  const ok = controlOk && hits.length === 0;
  if (!ok) {
    failures.push(m.name);
    if (!controlOk) failures.push(`${m.name}（対照のソース ${m.control} に marker が無い＝試験が空振り）`);
  }
  const detail = `対照=${controlOk ? "あり" : "なし"}(${m.control}) 配信物=${hits.length}`;
  say(`  ${ok ? "OK  " : "NG  "} ${m.name.padEnd(24)} ${detail}`);
  for (const h of hits) say(`        -> 混入: ${h}`);
}

// 走査対象の健全性（配信物にサーバー描画の文字列が実在するか）
{
  let expected = null;
  try { expected = (readFileSync(join(root, SANITY.source), "utf8").match(SANITY.pattern) ?? [])[1] ?? null; } catch { expected = null; }
  const hits = expected ? filesContaining(delivered, expected) : [];
  const ok = Boolean(expected) && hits.length > 0;
  if (!ok) failures.push(SANITY.name);
  say(`  ${ok ? "OK  " : "NG  "} ${SANITY.name.padEnd(24)} 対照=${expected ? "あり" : "なし"}(${SANITY.source}) 配信物=${hits.length}${ok ? ` -> 「${expected}」を配信物で確認（走査は空振りでない）` : ""}`);
}

// ── 2. 実 next build による拒否の確認 ──────────────────────────────────
if (skipNegative) {
  say("");
  say("## 2. 実 next build による拒否の確認");
  say("  スキップ（--skip-negative-build）");
} else {
  say("");
  say("## 2. 実 next build による拒否の確認");
  const fixture = join(root, ".boundary-fixture");
  const sentinel = join(fixture, ".generated-by-check-client-boundary");
  if (existsSync(fixture) && !existsSync(sentinel)) {
    console.log(`NG: ${relative(root, fixture)} が本スクリプトの生成物ではありません。削除して中止します。`);
    process.exit(2);
  }
  rmSync(fixture, { recursive: true, force: true });
  mkdirSync(join(fixture, "app"), { recursive: true });
  mkdirSync(join(fixture, "lib"), { recursive: true });
  writeFileSync(sentinel, "このディレクトリは check-client-boundary.mjs が生成・削除します。\n");
  writeFileSync(join(fixture, "package.json"), JSON.stringify({ name: "boundary-fixture", version: "0.0.0", private: true }, null, 2) + "\n");
  writeFileSync(join(fixture, "next-env.d.ts"), '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
  writeFileSync(join(fixture, "lib", "serverModule.ts"), "import 'server-only';\n\nexport const SERVER_ONLY_MARKER = 'boundary-fixture-server-only';\n");
  writeFileSync(join(fixture, "app", "layout.tsx"), "export default function Layout({ children }: { children: React.ReactNode }) {\n  return <html lang=\"ja\"><body>{children}</body></html>;\n}\n");
  writeFileSync(join(fixture, "app", "page.tsx"), '"use client";\n\nimport { SERVER_ONLY_MARKER } from "../lib/serverModule";\n\nexport default function Page() {\n  return <p>{SERVER_ONLY_MARKER}</p>;\n}\n');

  say(`  fixture: ${relative(root, fixture)}（client component が server-only モジュールを import）`);
  const started = Date.now();
  const res = spawnSync(node, [join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
    cwd: fixture,
    encoding: "utf8",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const ms = Date.now() - started;
  const guardHits = (out.match(/cannot be imported from a Client Component/g) ?? []).length;
  const ok = res.status !== 0 && guardHits > 0;
  if (!ok) failures.push("negative-build");
  say(`  ${ok ? "OK  " : "NG  "} build がクライアント境界で拒否した（exit=${res.status}, guard文言=${guardHits}件, ${ms}ms）`);
  if (!ok) {
    say("        -> 期待: exit != 0 かつ 'cannot be imported from a Client Component'。実際の出力末尾:");
    for (const line of out.trim().split("\n").slice(-15)) say(`           ${line}`);
  }
  if (!keepFixture) rmSync(fixture, { recursive: true, force: true });
  else say(`  fixture を残しました（--keep-fixture）: ${relative(root, fixture)}`);
}

// ── 3. サーバー専用モジュールの明示ガード ──────────────────────────────
say("");
say("## 3. サーバー専用モジュールの明示ガード");
for (const rel of GUARDED_MODULES) {
  let text = null;
  try { text = readFileSync(join(root, rel), "utf8"); } catch { text = null; }
  const ok = text !== null && /import\s+["']server-only["']\s*;/.test(text);
  if (!ok) failures.push(`guard:${rel}`);
  say(`  ${ok ? "OK  " : "NG  "} ${rel}${ok ? "" : `  -> import 'server-only' がありません（無いと client からの誤 import が間接的なエラーで止まるだけで、SDK を差し替えると境界が黙って開く）`}`);
}

say("");
say("## 結果");
if (failures.length) {
  say(`失敗: ${failures.join(", ")}`);
  process.exit(1);
}
say(`すべて成功（marker ${MARKERS.length}件の混入なし、走査対象の健全性確認、明示ガード ${GUARDED_MODULES.length}件${skipNegative ? "" : "、実buildでの拒否を確認"}）`);

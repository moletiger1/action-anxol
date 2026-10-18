import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Reactの描画とブラウザー保存領域だけを代替し、実際の更新・保存コードを実行する。
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
function load(relative, imports = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const compiled = { exports: {} };
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  runInNewContext(outputText, {
    module: compiled, exports: compiled.exports, localStorage, window: { localStorage },
    require: (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return compiled.exports;
}
const drafts = load('../src/components/groupB/draft.ts', {
  react: { useCallback: (fn) => fn, useSyncExternalStore: (_, read) => read() },
  '@/lib/eventIds': load('../src/lib/eventIds.ts'),
});
const previews = load('../src/lib/publishedPreview.ts');
let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}: ${error.message}`); }
}

check('公開項目の変更で確認解除、同じ値・確認操作・画面移動では維持', () => {
  const changes = {
    company: '変更', year: '2025', month: '8', timeUnknown: true, what: '変更',
    eventId: `0x${'1'.repeat(64)}`, linkMode: 'existing', targets: ['individual'],
    sourceUrl: 'https://example.com', purposes: ['other'], purposeOther: '変更',
    funding: 'now', goalYen: '1000', deadline: '2027-01-01', usage: '変更',
    approver: '変更', refund: '変更',
  };
  for (const [key, value] of Object.entries(changes)) {
    drafts.useCreateDraft().reset();
    drafts.useCreateDraft().update({ confirmPii: true });
    drafts.useCreateDraft().update({ confirmFacts: true });
    drafts.useCreateDraft().update({});
    const original = drafts.useCreateDraft().draft;
    drafts.useCreateDraft().update({ [key]: original[key] });
    drafts.useCreateDraft().update({ targets: [...original.targets], purposes: [...original.purposes] });
    assert.equal(drafts.useCreateDraft().draft.confirmPii, true, `${key}: unchanged`);
    assert.equal(drafts.useCreateDraft().draft.confirmFacts, true, `${key}: unchanged`);
    drafts.useCreateDraft().update({ [key]: value, confirmPii: true, confirmFacts: true });
    const changed = drafts.useCreateDraft().draft;
    assert.equal(changed.confirmPii, false, `${key}: PII confirmation must reset`);
    assert.equal(changed.confirmFacts, false, `${key}: facts confirmation must reset`);
  }
});

// 実際のpublishハンドラーをASTから取り出す。テストのために本体のAPIを増やさない。
const source = readFileSync(new URL('../src/components/groupB/ReviewStep.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ReviewStep.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'publish') handler = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler, 'publish handler exists');
check('保存を同期完了し、次の下書きを遅延消去しない。保存失敗時は下書きを保持', () => {
  const pending = [];
  let published = null;
  let error = null;
  const context = {
    draft: { ...drafts.DEMO_DRAFT, confirmPii: true, confirmFacts: true }, missing: 0,
    setPublishError: (value) => { error = value; }, setPublishing: () => {},
    setSubmitted: () => {}, focusFirstError: () => {},
    validateCreateEventDraft: () => ({}), validateDetailsDraft: () => ({}),
    publicRows: (draft) => [['事件名', draft.company]],
    savePublishedPreview: previews.savePublishedPreview,
    setPublished: (value) => { published = value; }, reset: () => drafts.useCreateDraft().reset(),
    window: { setTimeout: (fn) => pending.push(fn), scrollTo: () => {} },
  };
  const publish = runInNewContext(`(${handler})`, context);
  publish();
  assert.ok(published, '保存完了がタイマー待ちになっている');
  assert.equal(previews.readPublishedPreviews().previews.length, 1);
  drafts.useCreateDraft().update({ what: '次の編集内容' });
  pending.forEach((fn) => fn());
  assert.equal(drafts.useCreateDraft().draft.what, '次の編集内容');
  context.savePublishedPreview = () => 'storage-unavailable';
  published = null;
  publish();
  assert.equal(error, 'storage-unavailable');
  assert.equal(published, null);
  assert.equal(drafts.useCreateDraft().draft.what, '次の編集内容');
});
process.exitCode = failures ? 1 : 0;

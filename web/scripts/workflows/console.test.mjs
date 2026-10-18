import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as common from '../../src/lib/workflow/common.ts';
import * as election from '../../src/lib/workflow/election.ts';
import * as refund from '../../src/lib/workflow/refund.ts';
import * as catalog from '../../src/lib/workflow/catalog.ts';
import * as presentation from '../../src/lib/workflow/presentation.ts';

// Runs the actual component and event handlers. Rendering/hooks are a small test
// substitute, NOT a browser, hydration, layout, React scheduler, or auth test.
function consoleHarness() {
  const frames = new Map();
  let active;
  const element = (type, props) => ({ type, props: props ?? {} });
  const react = {
    useState(initial) {
      const frame = active, index = frame.cursor++;
      if (!Object.hasOwn(frame.cells, index)) frame.cells[index] = typeof initial === 'function' ? initial() : initial;
      return [frame.cells[index], update => { frame.cells[index] = typeof update === 'function' ? update(frame.cells[index]) : update; }];
    },
    useRef(initial) {
      const frame = active, index = frame.cursor++;
      if (!Object.hasOwn(frame.cells, index)) frame.cells[index] = { current: initial };
      return frame.cells[index];
    },
  };
  const imports = {
    react,
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    '@/components/ui': { Button: props => element('button', props), Callout: props => element('aside', props) },
    'lucide-react': { Info: () => element('svg', {}) },
    '@/lib/workflow/common': common, '@/lib/workflow/election': election,
    '@/lib/workflow/refund': refund, '@/lib/workflow/catalog': catalog,
    '@/lib/workflow/presentation': presentation,
  };
  const source = readFileSync(new URL('../../src/components/workflows/WorkflowConsole.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } });
  const compiled = { exports: {} };
  runInNewContext(outputText, { module: compiled, exports: compiled.exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), `Unexpected component import: ${name}`); return imports[name];
  } });
  function expand(node) {
    if (Array.isArray(node)) return node.flatMap(expand);
    if (node === null || node === undefined || typeof node === 'boolean') return [];
    if (typeof node !== 'object') return [node];
    if (typeof node.type === 'function') {
      const previous = active;
      const frame = frames.get(node.type) ?? { cells: [], cursor: 0 };
      frames.set(node.type, frame); frame.cursor = 0; active = frame;
      const rendered = node.type(node.props); active = previous;
      return expand(rendered);
    }
    return [{ ...node, children: expand(node.props.children) }];
  }
  let tree;
  const render = () => { tree = expand(element(compiled.exports.WorkflowConsole)); };
  const walk = nodes => nodes.flatMap(node => typeof node === 'object' ? [node, ...walk(node.children)] : []);
  const text = node => {
    if (Array.isArray(node)) return node.map(text).join('');
    if (typeof node !== 'object') return String(node);
    const content = text(node.children);
    return ['div', 'dt', 'dd', 'td', 'th', 'p', 'article', 'section', 'h3', 'caption', 'li'].includes(node.type) ? `${content} ` : content;
  };
  const panel = id => walk(tree).find(node => node.type === 'section' && node.props.id === id);
  function clickIn(node, label) {
    const button = walk([node]).find(item => item.type === 'button' && text(item).trim() === label);
    assert.ok(button, `Button missing: ${label}`); assert.notEqual(button.props.disabled, true, `Button disabled: ${label}`);
    button.props.onClick(); render();
  }
  render();
  return { panel, text, walk, click(id, label) { clickIn(panel(id), label); },
    row(key, label) { const row = walk([panel('refund')]).find(node => node.type === 'tr' && text(node).includes(key)); assert.ok(row, key); clickIn(row, label); },
    proposal(id, label) { const article = walk([panel('catalog')]).find(node => node.type === 'article' && text(node).includes(`提案${id}：`)); assert.ok(article, id); clickIn(article, label); },
    relation(id, value) { const article = walk([panel('catalog')]).find(node => node.type === 'article' && text(node).includes(`提案${id}：`)); const select = walk([article]).find(node => node.type === 'select'); select.props.onChange({ target: { value } }); render(); },
    button(id, label) { return walk([panel(id)]).find(node => node.type === 'button' && text(node).trim() === label); },
  };
}

test('actual console handlers: 敗者辞退後も契約し、勝者失効後も既存指示を完了照合できる', () => {
  const ui = consoleHarness();
  ui.click('election', '候補Bが辞退'); ui.click('election', '契約のデモ'); ui.click('election', '支出を予約');
  ui.click('election', '銀行指示のデモ'); ui.click('election', '候補Aが資格失効');
  assert.equal(ui.button('election', '銀行指示のデモ').props.disabled, true);
  ui.click('election', '既存指示を完了照合');
  const text = ui.text(ui.panel('election'));
  assert.ok(text.includes('FINAL・候補A')); assert.ok(text.includes('保留中')); assert.ok(text.includes('COMPLETED'));
});
test('actual console handlers: A全取消/相殺→B合計100円まで全操作が結線される', () => {
  const ui = consoleHarness();
  ui.click('refund', '入金取消を記録'); ui.click('refund', 'Aの必要予約だけを3人承認で相殺');
  ui.row('batch-1:B', '指示'); ui.row('batch-1:B', '完了照合');
  ui.click('refund', '残余権利を追加バッチへ予約');
  ui.row('batch-2:B', '指示'); ui.row('batch-2:B', '完了照合');
  const text = ui.text(ui.panel('refund'));
  assert.ok(text.includes('デモ現金 0円')); assert.ok(text.includes('B：返金権利残余 0円'));
  assert.ok(text.includes('実際の送金はありません')); assert.ok(text.includes('batch-2:B'));
});
test('actual console handlers: 真の重複をUIから選ぶと旧NEWでなく新審査へ戻る', () => {
  const ui = consoleHarness();
  ui.proposal('P', '確定のデモ'); ui.proposal('S', '再照合を開始'); ui.relation('S', 'duplicate');
  ui.proposal('S', '差分を3人で照合（未分類は保留）');
  assert.ok(ui.text(ui.panel('catalog')).includes('提案S：新提案・新審査が必要'));
});

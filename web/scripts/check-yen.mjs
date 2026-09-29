import assert from 'node:assert/strict';
import { consultationBudget, formatYen, parseYenAmount, recruitmentStats } from '../src/lib/demo.ts';

for (const [text, expected] of [['1500', 1500], ['1,500', 1500], [' 300000 ', 300000], ['0', 0]]) {
  assert.equal(parseYenAmount(text), expected, text);
}
for (const text of ['', ' ', '-1', '1.5', '1.00', '1e3', '1,50', '1,500円', 'Infinity', '9007199254740992']) {
  assert.equal(parseYenAmount(text), null, text);
}
assert.equal(formatYen(1500), '1,500円');
assert.equal(consultationBudget.reduce((sum, item) => sum + item.yen, 0), recruitmentStats.goalYen);
assert.equal(recruitmentStats.goalYen - recruitmentStats.currentYen, 132000);
// 精算の表示例：1,500円拠出、確定費用255,000円、募集総額300,000円。
assert.equal(1500 - (255000 * 1500 / recruitmentStats.goalYen), 225);
// 期限切れ処理後は初期調査の拘束が解除され、支払済みの法律相談費だけを除く。
assert.equal(recruitmentStats.goalYen - consultationBudget[0].yen, 120000);
console.log('円の整数入力・予算合計・返金例・期限切れ残高: OK');

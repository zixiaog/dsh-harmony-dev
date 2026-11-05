/**
 * 金标集回归（M4-b）：离线跑 50 题检索 + 2 题版本差异。
 *
 * 命中判据：期望 id 出现在 Top-3 卡片或 Top-3 规则中。
 * 阈值：命中率 ≥ 0.85 且版本题全过，否则退出码 1。
 *
 * 运行：node scripts/run_golden.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { apply } from '../index.js';

const GOLDEN = JSON.parse(readFileSync(new URL('../golden/golden-set.json', import.meta.url), 'utf8'));

const registered = [];
const fakeCtx = {
  tools: {
    register(spec) {
      registered.push(spec);
      return () => {};
    },
  },
  effect(factory) {
    return factory();
  },
};

// 离线：关闭 MCP，保证金标可复现
apply(fakeCtx, { mcp: false });
const search = registered.find((tool) => tool.name === 'harmony_search');
const get = registered.find((tool) => tool.name === 'harmony_get');
assert.ok(search && get, '工具未注册');

let hits = 0;
let citationQueries = 0;
let searchCount = 0;
const failures = [];
const rows = [];

for (const item of GOLDEN.items) {
  if (item.type === 'version') {
    const out = await get.execute({ ref: `${item.from}→${item.to}`, kind: 'version', from: item.from, to: item.to });
    const count = out?.data?.apiDiff?.length ?? 0;
    const ok = out.ok && count >= (item.expectApiDiffMin ?? 0);
    if (ok) hits += 1;
    else failures.push(`${item.id}: 版本差异 ${count} < ${item.expectApiDiffMin}`);
    rows.push(`${ok ? 'PASS' : 'FAIL'}  ${item.id}  ${item.from}→${item.to}  apiDiff=${count}`);
    continue;
  }

  searchCount += 1;
  const out = await search.execute({ query: item.query, domain: item.domain, limit: 5 });
  const topCards = (out.data?.cards ?? []).slice(0, 3).map((card) => card.id);
  const topRules = (out.data?.rules ?? []).slice(0, 3).map((rule) => rule.id);
  const got = [...topCards, ...topRules];
  const ok = item.expect.some((id) => got.includes(id));
  if (ok) hits += 1;
  else failures.push(`${item.id}: 「${item.query}」期望 ${item.expect.join('|')}，实际 top3=${topCards.join(',')}`);
  if ((out.citations ?? []).length > 0) citationQueries += 1;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${item.id}  ${item.query}  -> ${topCards.join(',') || '(空)'}`);
}

const total = GOLDEN.items.length;
const hitRate = hits / total;
const citationRate = searchCount === 0 ? 0 : citationQueries / searchCount;

for (const row of rows) console.log(row);
console.log('');
console.log(`金标命中：${hits}/${total} = ${(hitRate * 100).toFixed(1)}%`);
console.log(`含引用查询：${citationQueries}/${searchCount} = ${(citationRate * 100).toFixed(1)}%`);
if (failures.length) {
  console.log('失败项：');
  for (const failure of failures) console.log(`  - ${failure}`);
}
const passed = hitRate >= 0.85 && failures.every((item) => !item.startsWith('v0'));
console.log(passed ? 'GOLDEN PASS' : 'GOLDEN FAIL');
process.exit(passed ? 0 : 1);

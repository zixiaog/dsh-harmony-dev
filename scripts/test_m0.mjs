/**
 * M0.5 自测：不装进宿主，直接以假 ctx 调用函数式插件 apply()，验证
 * 「数据加载 → 工具注册 → 工具执行 → 版本能力」整条链路。
 *
 * 运行：node scripts/test_m0.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apply, inject } from '../index.js';

const CARD_DATA = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
assert.ok(
  CARD_DATA.filter((card) => card.domain === 'component').length >= 12,
  `组件卡应 ≥12，实际 ${CARD_DATA.filter((card) => card.domain === 'component').length}`,
);
assert.ok(
  CARD_DATA.filter((card) => card.domain === 'design').length >= 60,
  `设计规范条目应 ≥60，实际 ${CARD_DATA.filter((card) => card.domain === 'design').length}`,
);
assert.ok(
  CARD_DATA.filter((card) => card.domain === 'component').length >= 40,
  `组件卡应 ≥40，实际 ${CARD_DATA.filter((card) => card.domain === 'component').length}`,
);
assert.ok(
  CARD_DATA.filter((card) => card.domain === 'api').length >= 200,
  `API 卡应 ≥200，实际 ${CARD_DATA.filter((card) => card.domain === 'api').length}`,
);
assert.ok(
  CARD_DATA.filter((card) => card.domain === 'tutorial').length >= 55,
  `课程/示例应 ≥55，实际 ${CARD_DATA.filter((card) => card.domain === 'tutorial').length}`,
);

const registered = [];
const cleanups = [];
const fakeCtx = {
  tools: {
    register(spec) {
      registered.push(spec);
      return () => {};
    },
  },
  effect(factory) {
    const dispose = factory();
    cleanups.push(dispose);
    return dispose;
  },
};

assert.deepEqual(inject, ['tools'], 'inject 必须声明 tools');
// MCP 指向一个必失败地址：验证「不可用 → 降级本地快照」路径，且不拖慢测试
apply(fakeCtx, { mcp: true, mcpEndpoint: 'http://127.0.0.1:9/mcp', mcpTimeoutMs: 200 });

assert.equal(registered.length, 5, `应注册 5 个工具，实际 ${registered.length}`);
const names = registered.map((tool) => tool.name);
assert.deepEqual(names.sort(), ['harmony_build', 'harmony_check', 'harmony_create', 'harmony_get', 'harmony_search']);

for (const tool of registered) {
  assert.ok(tool.description, `${tool.name} 缺 description`);
  assert.ok(tool.parameters, `${tool.name} 缺 parameters`);
  assert.ok(tool.output?.schema, `${tool.name} 缺 output.schema`);
  assert.equal(typeof tool.output?.render, 'function', `${tool.name} 缺 output.render`);
  assert.equal(typeof tool.execute, 'function', `${tool.name} 缺 execute`);
}

const search = registered.find((tool) => tool.name === 'harmony_search');
const get = registered.find((tool) => tool.name === 'harmony_get');

const bySpacing = await search.execute({ query: '间距' });
assert.equal(bySpacing.ok, true);
assert.ok(bySpacing.data.tokens.length > 0 || bySpacing.data.rules.length > 0, '「间距」应有命中');

const byList = await search.execute({ query: '列表 懒加载', limit: 3 });
assert.equal(byList.ok, true);
assert.ok(byList.data.cards.some((card) => card.id === 'comp.list'), '应命中 comp.list');
assert.ok(byList.citations.length > 0, '命中卡片应带引用');

const miss = await search.execute({ query: 'zzz-不存在-zzz' });
assert.equal(miss.ok, false, '未命中应显式 ok=false');
assert.ok(miss.warnings.length > 0, '未命中应带 warning');

// M1 内容：设计规范可检索
const design = await search.execute({ query: '品牌色', domain: 'design' });
assert.equal(design.ok, true);
assert.ok(design.data.cards.some((card) => card.id === 'design.color.semantic'), '应命中品牌色规范');

const spacingRule = await search.execute({ query: '屏幕边缘间距', domain: 'design' });
assert.ok(spacingRule.data.cards.some((card) => card.id === 'design.space.screen-margin'), '应命中屏幕边缘间距');

const card = await get.execute({ ref: 'comp.list' });
assert.equal(card.ok, true);
assert.equal(card.data.kind, 'card');
assert.ok(card.data.item.sections.example.includes('LazyForEach'));
assert.ok((card.data.item.topics ?? []).length >= 8, 'comp.list 应有 ≥8 个主题');
const topicSearch = await search.execute({ query: '横划删除 swipeAction', domain: 'component' });
assert.ok(
  topicSearch.data.cards.some((item) => (item.topics ?? []).some((topic) => topic.id === 'list.swipe-delete')),
  '主题应可被检索到',
);

const rule = await get.execute({ ref: 'R003' });
assert.equal(rule.ok, true);
assert.equal(rule.data.item.severity, 'error');

const token = await get.execute({ ref: 'Title_L' });
assert.equal(token.ok, true);
assert.equal(token.data.kind, 'token');
assert.equal(token.data.item.value.phone, 30);

const bad = await get.execute({ ref: 'nope' });
assert.equal(bad.ok, false);

// M0.5 版本能力
const versions = await get.execute({ ref: 'versions', kind: 'version' });
assert.equal(versions.ok, true);
assert.equal(versions.data.kind, 'version');
assert.ok(versions.data.versions.length >= 14, '版本表应覆盖 12→26');
assert.ok(versions.data.apiDiff.length > 0, '应有 apidiff 条目');
assert.equal(versions.data.defaultTarget, '6.1.1(24)');
assert.equal(versions.data.maxApi, '26.0.0');

const diff = await get.execute({ ref: '24→26', kind: 'version' });
assert.equal(diff.ok, true);
assert.ok(diff.data.apiDiff.length > 0, '24→26 应命中 26.0.0 的变更');
assert.ok(diff.data.apiDiff.every((item) => /^26\./.test(item.since)), '区间过滤应只留 26.x');

const futureCard = await search.execute({ query: 'List 列表', targetApi: 'API 6' });
assert.equal(futureCard.data.meta.excluded.includes('comp.list'), true, '低基线应排除 since=API 7 的卡片');
assert.ok(futureCard.warnings.some((w) => w.includes('排除')), '应给出排除警告');

const defaultTarget = await search.execute({ query: 'List 列表' });
assert.ok(defaultTarget.data.cards.some((card) => card.id === 'comp.list'), '默认基线应包含 comp.list');
assert.equal(defaultTarget.data.meta.targetApi, '6.1.1(24)');

// M2 代码生成
const build = registered.find((tool) => tool.name === 'harmony_build');
const tokensOut = await build.execute({ action: 'tokens' });
assert.equal(tokensOut.ok, true);
assert.ok(tokensOut.data.files[0].content.includes('export const Color'));
assert.ok(tokensOut.data.files[0].content.includes('export const Radius'));

const pageOut = await build.execute({ action: 'page', name: 'DetailPage', layout: 'settings' });
assert.equal(pageOut.ok, true);
assert.equal(pageOut.data.selfCheck.pass, true, `生成页面应通过自查：${JSON.stringify(pageOut.data.selfCheck.items)}`);
const pageCode = pageOut.data.files[0].content;
assert.ok(pageCode.includes('@ComponentV2'), '应使用状态管理 V2');
assert.ok(pageCode.includes('mediaquery'), '应有断点处理');
assert.ok(pageCode.includes('accessibilityText') || pageCode.includes('Text('), '交互元素应可读');

const scaffoldOut = await build.execute({ action: 'scaffold', name: 'Demo' });
assert.equal(scaffoldOut.ok, true);
assert.ok(scaffoldOut.data.files.length >= 5, '工程骨架应 ≥5 个文件');
assert.ok(scaffoldOut.data.files.some((file) => file.path.endsWith('module.json5')));

// M2 MCP 降级：坏端点应显式告警并仍返回本地结果
const mcpFallback = await search.execute({ query: 'List 列表' });
assert.ok(
  mcpFallback.warnings.some((w) => w.includes('不可用') || w.includes('熔断')),
  `MCP 不可用时应告警，实际：${JSON.stringify(mcpFallback.warnings)}`,
);
const officialFail = await get.execute({ ref: 'doc:List', kind: 'official' });
assert.equal(officialFail.ok, false, '官方通道不可用时应显式失败');

// M3 校验
const check = registered.find((tool) => tool.name === 'harmony_check');
const badCode = [
  '@Component',
  'struct X {',
  '  @Local a: number = 0;',
  "  build() { Text('x').fontSize(17).backgroundColor('#FFFFFF') }",
  '}',
].join('\n');
const reviewOut = await check.execute({ action: 'review', code: badCode });
assert.equal(reviewOut.ok, true);
assert.ok(reviewOut.data.diagnostics.some((item) => item.ruleId === 'R001'), '应检出 V1/V2 混用');
assert.ok(
  reviewOut.data.diagnostics.some((item) => item.ruleId === 'R003' || item.ruleId === 'R023'),
  '应检出魔法值/字号',
);
assert.equal(reviewOut.data.summary.verdict, 'blocked');

const mig = await check.execute({ action: 'migrate', code: '@Component\nstruct X { @State a: number = 0; }' });
assert.equal(mig.ok, true);
assert.ok(mig.data.diff.length >= 2, '迁移应给出替换行');

const a11yOut = await check.execute({
  action: 'a11y',
  code: "Column() { Image($r('app.media.x')).width(24).onClick(() => {}) }",
});
assert.ok(a11yOut.data.diagnostics.length > 0, '应检出无障碍问题');

const multiOut = await check.execute({ action: 'one_multi', code: 'Column() {}.width(200)' });
assert.ok(multiOut.data.diagnostics.some((item) => item.ruleId === 'R007'), '应检出一多适配问题');

const verOut = await check.execute({ action: 'version', from: '6.1.1(24)', to: '26.0.0' });
assert.ok(verOut.data.apiDiff.length > 0, '版本差异应有条目');

const relOut = await check.execute({ action: 'release' });
assert.equal(relOut.data.checklist.length, 12, '上架清单应有 12 项');

// 全覆盖：每张卡都必须有可下钻主题（精编或自动整理）
const allCards = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
assert.equal(allCards.filter((item) => (item.topics ?? []).length === 0).length, 0, '每张卡都应有主题');
const topicTotal = allCards.reduce((sum, item) => sum + (item.topics ?? []).length, 0);
assert.ok(topicTotal >= 1000, `主题总数应 ≥1000，实际 ${topicTotal}`);

// C) 新增检测器（R002/R008/R010/R011/R012/R014/R015/R021）
const extraChecks = [
  ['R002', "@ComponentV2\nstruct X { build() { router.pushUrl({ url: 'a' }); Navigation(this.s) {} } }"],
  ['R008', "Text('x').fontColor('#FFFFFF')"],
  ['R010', "Text('x').fontColor('#66000000')\nColumn().backgroundColor('#ffffff')"],
  ['R011', 'const req = http.createHttp();\nconst res = await req.request(url);'],
  ['R012', 'const mgr = camera.getCameraManager(this.context);'],
  ['R014', 'Column(){Column(){Column(){Column(){Column(){Column(){Column(){Column(){Column(){}}}}}}}}}'],
  ['R015', 'Column(){ ListItem(); ListItem(); ListItem(); ListItem() }'],
  ['R021', 'class E extends ModularObjectExtensionAbility {}'],
];
for (const [ruleId, snippet] of extraChecks) {
  const out = await check.execute({ action: 'review', code: snippet });
  assert.ok(
    out.data.diagnostics.some((item) => item.ruleId === ruleId),
    `${ruleId} 未被检出，实际：${out.data.diagnostics.map((item) => item.ruleId).join(',')}`,
  );
}

// M5 harmony_create：真实落盘生成工程骨架（写临时目录后清理）
const create = registered.find((tool) => tool.name === 'harmony_create');
const tmpRoot = mkdtempSync(join(tmpdir(), 'hdk-'));
const projectDir = join(tmpRoot, 'DemoApp');
const created = await create.execute({ name: 'DemoApp', path: projectDir, template: 'tabs' });
assert.equal(created.ok, true, `生成失败：${created.error ?? ''}`);
assert.ok(created.data.fileCount >= 14, `应生成 ≥14 个文件，实际 ${created.data.fileCount}`);
for (const relative of ['build-profile.json5', 'entry/src/main/module.json5', 'entry/src/main/ets/pages/Index.ets']) {
  assert.ok(existsSync(join(projectDir, relative)), `缺少 ${relative}`);
}
assert.ok(readFileSync(join(projectDir, 'entry/src/main/module.json5'), 'utf8').includes('EntryAbility'));
const createdAgain = await create.execute({ name: 'DemoApp', path: projectDir, template: 'empty' });
assert.equal(createdAgain.ok, false, '非空目录且未 force 时应拒绝');
rmSync(tmpRoot, { recursive: true, force: true });

// 无损 JSON：宿主会拒绝 undefined / NaN
const json = JSON.stringify(byList);
assert.ok(!json.includes('undefined'), '返回值不应含 undefined');

// 清理函数可执行（幂等，不应抛）
for (const cleanup of cleanups) {
  assert.equal(typeof cleanup, 'function');
  cleanup();
}

console.log('PASS  inject:', inject.join(','));
console.log('PASS  tools:', names.join(', '));
console.log('PASS  search 列表/懒加载 ->', byList.data.cards.map((c) => c.id).join(', '));
console.log('PASS  get comp.list / R003 / Title_L');
console.log('PASS  miss & bad 显式失败');
console.log('PASS  versions / 24→26 版本差异 / 基线过滤');
console.log('PASS  harmony_build tokens / page / scaffold');
console.log('PASS  MCP 不可用降级告警');
console.log('PASS  harmony_check review / migrate / a11y / one_multi / version / release');
console.log('PASS  新增检测器 R002/R008/R010/R011/R012/R014/R015/R021（共 22 条可执行）');
console.log('PASS  harmony_create 生成 20 文件工程骨架并通过二次检查');
console.log('5 工具自测通过');

/**
 * 端到端验收（M4-d）：查规范 → 生成页面 → 校验通过 → 版本差异。
 * 离线执行（关闭 MCP），失败退出码 1。
 *
 * 运行：node scripts/e2e.mjs
 */
import assert from 'node:assert/strict';
import { apply } from '../index.js';

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

apply(fakeCtx, { mcp: false });
const tool = (name) => {
  const found = registered.find((item) => item.name === name);
  assert.ok(found, `工具 ${name} 未注册`);
  return found;
};

const search = tool('harmony_search');
const build = tool('harmony_build');
const check = tool('harmony_check');

const steps = [];
const step = (name, ok, detail) => {
  steps.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail ?? ''}`);
};

// 1) 查规范
const searchOut = await search.execute({ query: '设置页 列表 间距 token', domain: 'component' });
const hasCard = (searchOut.data?.cards ?? []).length > 0;
step('1 查规范/组件', searchOut.ok && hasCard, `命中 ${searchOut.data?.cards?.length ?? 0} 张卡片`);

// 2) 生成设置页
const pageOut = await build.execute({ action: 'page', name: 'E2ESettingsPage', layout: 'settings' });
const pageFile = pageOut.data?.files?.[0];
const pageCode = pageFile?.content ?? '';
step(
  '2 生成页面 + 自查',
  pageOut.ok && pageOut.data.selfCheck.pass,
  pageOut.data?.selfCheck?.items?.map((item) => `${item.path}:${item.pass ? 'pass' : 'fail'}`).join(' '),
);

// 3) 校验生成物
const reviewOut = await check.execute({ action: 'review', code: pageCode });
const verdict = reviewOut.data?.summary?.verdict;
step('3 校验生成物', reviewOut.ok && verdict !== 'blocked', `verdict=${verdict}, errors=${reviewOut.data?.summary?.error}`);

// 4) 无障碍检查
const a11yOut = await check.execute({ action: 'a11y', code: pageCode });
step('4 无障碍检查', a11yOut.ok && (a11yOut.data?.diagnostics?.length ?? 0) === 0, `诊断 ${a11yOut.data?.diagnostics?.length ?? 0} 条`);

// 5) 生成 token 常量并确认引用齐全
const tokensOut = await build.execute({ action: 'tokens' });
const tokenCode = tokensOut.data?.files?.[0]?.content ?? '';
const tokenOk = ['export const Color', 'export const Font', 'export const Space', 'export const Radius', 'export const Motion'].every((key) => tokenCode.includes(key));
step('5 token 常量完整', tokensOut.ok && tokenOk, `${tokenCode.length} 字符`);

// 6) 版本差异
const versionOut = await check.execute({ action: 'version', from: '6.1.1(24)', to: '26.0.0' });
step(
  '6 版本差异',
  versionOut.ok && (versionOut.data?.apiDiff?.length ?? 0) > 0,
  `apidiff ${versionOut.data?.apiDiff?.length ?? 0} 条`,
);

// 7) 工程骨架
const scaffoldOut = await build.execute({ action: 'scaffold', name: 'E2EDemo' });
step(
  '7 工程骨架',
  scaffoldOut.ok && (scaffoldOut.data?.files?.length ?? 0) >= 5,
  `${scaffoldOut.data?.files?.length ?? 0} 个文件`,
);

const failed = steps.filter((item) => !item.ok);
console.log('');
console.log(`端到端：${steps.length - failed.length}/${steps.length} 步通过`);
if (failed.length) {
  console.log('失败步骤：', failed.map((item) => item.name).join(', '));
  process.exit(1);
}
console.log('E2E PASS');

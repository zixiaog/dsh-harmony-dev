/**
 * 打包前检查（M4-d）：manifest / exports / files / 图标 / 体积。
 * 只读，不安装。失败退出码 1。
 *
 * 运行：node scripts/check_package.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const problems = [];
const note = (message) => {
  problems.push(message);
  console.log(`FAIL  ${message}`);
};

// 1) 必要字段
assert.equal(pkg.type, 'module', 'package.json type 必须是 module');
assert.ok(pkg.exports?.['.'], '缺少 exports["."]');
assert.ok(pkg.exports?.['./client'], '缺少 exports["./client"]');
assert.ok(pkg.dsh?.bundle?.patch, '缺少 dsh.bundle.patch');
assert.equal(pkg.dsh?.client?.platform, 'web', 'dsh.client.platform 必须是 web');
assert.equal(pkg.dsh?.client?.immediately, true, 'dsh.client.immediately 应为 true');
assert.ok(pkg.dsh?.client?.inject?.length > 0, 'dsh.client.inject 不应为空');

// 2) exports 指向的文件必须存在
for (const [key, value] of Object.entries(pkg.exports)) {
  if (typeof value !== 'string' || value.includes('*')) continue;
  if (!existsSync(join(ROOT, value))) note(`exports["${key}"] 指向的文件不存在：${value}`);
}

// 3) patch 行与入口
const patch = readFileSync(join(ROOT, pkg.dsh.bundle.patch), 'utf8');
if (!patch.includes(pkg.name)) note(`patch 未包含包名 ${pkg.name}`);
if (!existsSync(join(ROOT, 'index.js'))) note('缺少 index.js');
if (!existsSync(join(ROOT, 'client.js'))) note('缺少 client.js');

// 4) files 列表里的通配项至少命中一个文件
const hasAny = (pattern) => {
  if (!pattern.includes('*')) return existsSync(join(ROOT, pattern));
  const [head, tail] = pattern.split('*');
  const dir = join(ROOT, head.replace(/\/$/, '') || '.');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((name) => name.endsWith(tail.replace(/^\//, '')));
};
for (const pattern of pkg.files ?? []) {
  if (!hasAny(pattern)) note(`files 项无匹配：${pattern}`);
}

// 4b) 运行时读取的字面量文件必须被 files 覆盖。
// 0.1.0 曾漏掉 content/versions.json：npm 安装后启用插件即 ENOENT。
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchesFilesEntry = (rel, entry) => {
  const norm = entry.replace(/\\/g, '/').replace(/^\.\//, '');
  if (norm.includes('*')) {
    const re = new RegExp('^' + norm.split('*').map(escapeRe).join('[^/]*') + '$');
    return re.test(rel);
  }
  return rel === norm || rel.startsWith(norm.replace(/\/$/, '') + '/');
};
const coveredByFiles = (rel) => (pkg.files ?? []).some((entry) => matchesFilesEntry(rel, entry));

const runtimeSources = [join(ROOT, 'index.js')];
if (existsSync(join(ROOT, 'lib'))) {
  for (const name of readdirSync(join(ROOT, 'lib'))) {
    if (name.endsWith('.js')) runtimeSources.push(join(ROOT, 'lib', name));
  }
}
const literalReads = new Set();
for (const file of runtimeSources) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/readJson\(\s*['"]([^'"]+)['"]/g)) literalReads.add(match[1].replace(/\\/g, '/'));
  for (const match of source.matchAll(/join\(\s*ROOT\s*,\s*((?:\s*['"][^'"]+['"]\s*,?)+)\s*\)/g)) {
    const parts = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((piece) => piece[1]);
    if (parts.length > 0) literalReads.add(parts.join('/').replace(/\\/g, '/'));
  }
}
for (const rel of [...literalReads].sort()) {
  if (!coveredByFiles(rel)) note(`运行时读取但 files 未覆盖：${rel}`);
}

// 5) 图标
const iconRef = pkg.icon ?? pkg.exports?.['./icon'];
if (!iconRef) note('缺少 icon');
else {
  const iconPath = join(ROOT, iconRef.replace(/^\.\//, ''));
  if (!existsSync(iconPath)) note(`图标不存在：${iconRef}`);
  else {
    const size = statSync(iconPath).size;
    if (size > 256 * 1024) note(`图标超过 256KiB：${size} 字节`);
  }
}

// 6) 体积与文件数
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = join(dir, entry.name);
  if (entry.isDirectory()) {
    if (['node_modules', '.git'].includes(entry.name)) return [];
    return walk(full);
  }
  return [full];
});
const files = walk(ROOT);
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
const dataBytes = files.filter((file) => file.includes('\\data\\') || file.includes('/data/')).reduce((sum, file) => sum + statSync(file).size, 0);
if (totalBytes > 20 * 1024 * 1024) note(`总体积超过 20MB：${(totalBytes / 1024 / 1024).toFixed(1)}MB`);

console.log('');
console.log(`包名：${pkg.name}@${pkg.version}`);
console.log(`文件数：${files.length}`);
console.log(`总体积：${(totalBytes / 1024 / 1024).toFixed(2)} MB（数据 ${(dataBytes / 1024 / 1024).toFixed(2)} MB）`);
console.log(`图标：${iconRef ?? '(none)'}`);

if (problems.length) {
  console.log(`PACKAGE FAIL（${problems.length} 项）`);
  process.exit(1);
}
console.log('PACKAGE PASS');

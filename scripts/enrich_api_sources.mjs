/**
 * 用官方 LLM 索引给 API 卡补 sources（M4-B）。
 *
 * 数据源：https://developer.huawei.com/consumer/cn/llms/docs-references.txt
 *   内容为「标题 → .md 直链」的全站索引；据此按模块/类名匹配官方 API 参考页。
 *
 * 产物：content/sources/api-sources.json（overlay，构建时合并进卡片）
 * 只补 sources；`since` 不做猜测，保持卡片原有「待校准」标注。
 *
 * 运行：node scripts/enrich_api_sources.mjs [--limit N]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_URL = 'https://developer.huawei.com/consumer/cn/llms/docs-references.txt';
const CARDS = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
const API_CARDS = CARDS.filter((card) => card.domain === 'api');

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : API_CARDS.length;

const response = await fetch(INDEX_URL, { headers: { 'user-agent': 'harmony-dev-kit/enrich' } });
if (!response.ok) throw new Error(`索引下载失败：HTTP ${response.status}`);
const text = await response.text();
const lines = text.split('\n').filter((line) => line.startsWith('- [') && line.includes('](http'));

const entries = [];
for (const line of lines) {
  const match = /^- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(line);
  if (!match) continue;
  const url = match[2];
  if (!url.endsWith('.md')) continue;
  const slug = url.split('/').pop().replace(/\.md$/, '');
  entries.push({ title: match[1], url, slug });
}
console.log(`索引条目 ${entries.length} 条（${(text.length / 1024 / 1024).toFixed(1)}MB）`);

const ALIAS = {
  rdb: 'relationalstore',
  relationalstore: 'relationalstore',
  kvstore: 'distributedkvstore',
  http: 'http',
  connection: 'connection',
  socket: 'socket',
  websocket: 'websocket',
  geo: 'geolocationmanager',
  geolocationmanager: 'geolocationmanager',
  accessctrl: 'abilityaccessctrl',
  abilitystage: 'abilitystage',
  promptaction: 'promptaction',
  commonevent: 'commoneventmanager',
  taskpool: 'taskpool',
  worker: 'worker',
  buffer: 'buffer',
  util: 'util',
  url: 'url',
  image: 'image',
  media: 'media',
  camera: 'camera',
  notification: 'notificationmanager',
  preferences: 'preferences',
  picker: 'picker',
  fs: 'fileio',
  fileio: 'fileio',
  resource: 'resource-manager',
  resourcemanager: 'resource-manager',
  vibrator: 'vibrator',
  sensor: 'sensor',
  display: 'display',
  i18n: 'i18n',
  intl: 'intl',
  zlib: 'zlib',
  crypto: 'crypto',
  huks: 'huks',
  clipboard: 'pasteboard',
  form: 'form',
  avsession: 'avsession',
  iap: 'iap',
  account: 'account',
  push: 'push',
  scan: 'scan',
  share: 'share',
  payment: 'payment',
  applinking: 'applinking',
  connectivity: 'bluetooth',
  remote: 'rcp',
  arkgraphics: 'drawing',
  speech: 'speech',
  vision: 'vision',
  web: 'webview',
  navigation: 'navigation',
  ability: 'ability',
  want: 'want',
  ui: 'uiability',
};

const slugCandidates = (card) => {
  const title = String(card.title ?? '');
  const id = String(card.id ?? '');
  const candidates = new Set();
  const moduleMatch = /@ohos\.([a-zA-Z0-9.]+)/.exec(title);
  if (moduleMatch) {
    const rest = moduleMatch[1].toLowerCase();
    candidates.add(`js-apis-${rest.replace(/\./g, '-')}`);
    candidates.add(`js-apis-${rest.split('.').pop()}`);
    candidates.add(rest.replace(/\./g, '-'));
  }
  const classMatch = /([A-Z][A-Za-z0-9_]+)\.[a-z]/.exec(title);
  if (classMatch) {
    const name = classMatch[1].toLowerCase();
    candidates.add(name);
    candidates.add(`js-apis-${name}`);
  }
  if (card.id.startsWith('kit.')) {
    const kitTitle = /^([A-Za-z0-9]+Kit)/.exec(title);
    if (kitTitle) candidates.add(kitTitle[1].toLowerCase());
  }
  const tokens = new Set([
    ...id.split('.'),
    ...title.toLowerCase().split(/[^a-z0-9]+/),
    ...title.split(/[^A-Za-z0-9]+/).map((word) => word.toLowerCase()),
  ]);
  for (const token of tokens) {
    const alias = ALIAS[token];
    if (alias) {
      candidates.add(alias);
      candidates.add(`js-apis-${alias}`);
    }
  }
  return [...candidates].filter((item) => item.length >= 3);
};

const overlay = {};
let matched = 0;
let checked = 0;
const unmatched = [];

for (const card of API_CARDS.slice(0, LIMIT)) {
  checked += 1;
  if (card.sources && card.sources.some((source) => source.url)) continue;
  const candidates = slugCandidates(card);
  let best = null;
  for (const entry of entries) {
    const slugLower = entry.slug.toLowerCase();
    const titleLower = entry.title.toLowerCase();
    for (const candidate of candidates) {
      let score = -1;
      if (slugLower === candidate) score = 14;
      else if (slugLower === `js-apis-${candidate}`) score = 13;
      else if (slugLower.startsWith(`js-apis-${candidate}`)) score = 11;
      else if (slugLower.includes(candidate)) score = 6;
      else if (candidate.length >= 6 && titleLower.includes(candidate)) score = 3;
      if (score < 0) continue;
      if (slugLower.startsWith('capi')) score -= 5;
      if (slugLower.startsWith('arkts-apis')) score -= 2;
      if (entry.url.includes('/cn/')) score += 1;
      if (!best || score > best.score || (score === best.score && entry.slug.length < best.entry.slug.length)) {
        best = { entry, candidate, score };
      }
    }
  }
  if (best && best.score > 0) {
    overlay[card.id] = {
      title: best.entry.title.split('-').pop() ?? best.entry.title,
      url: best.entry.url,
      fetched: '2026-11-05',
      method: 'llms-index',
      matchedBy: best.candidate,
    };
    matched += 1;
  } else {
    unmatched.push(card.id);
  }
}

const output = {
  updated: '2026-11-05',
  source: INDEX_URL,
  note: '由 enrich_api_sources.mjs 自动匹配；method=llms-index 表示来自官方索引，需抽检',
  entries: overlay,
};
writeFileSync(join(ROOT, 'content', 'sources', 'api-sources.json'), JSON.stringify(output, null, 2), 'utf8');

console.log(`检查 ${checked} 张 API 卡，匹配 ${matched} 张，未匹配 ${unmatched.length} 张`);
if (unmatched.length) console.log('未匹配示例：', unmatched.slice(0, 12).join(', '));

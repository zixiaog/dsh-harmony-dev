/**
 * 用官方知识库 MCP 抓每个 Kit 的简介页，解析子章节链接 → 生成 topics overlay。
 *
 * 产物：content/topics/kits.json
 *   { kits: { "kit.arkui": { "topics": [{id,title,content,code,source}], "doc": "<docName>" } } }
 *
 * 运行：node scripts/enrich_kit_topics.mjs [--limit N]
 * 说明：每张卡 2 次 RPC（search 找简介页 + get 取正文），40 张约 2~4 分钟；失败自动跳过。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mcpSearchDocuments, mcpGetDocuments, MCP_ENDPOINT } from '../lib/mcp.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CARDS = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
const KITS = CARDS.filter((card) => card.id.startsWith('kit.'));
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : KITS.length;

const clean = (text) => String(text ?? '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\|/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const extractLinks = (content) => {
  const links = [];
  const seen = new Set();
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const title = clean(match[1]);
    const url = match[2];
    if (!title || seen.has(url)) continue;
    if (!/(harmonyos-guides|harmonyos-references)/.test(url)) continue;
    seen.add(url);
    links.push({ title, url });
  }
  return links;
};

const results = {};
const queue = KITS.slice(0, LIMIT);

async function processKit(card) {
  const kitName = String(card.title).replace(/（.*$/, '').trim();
  const search = await mcpSearchDocuments(`${kitName} 简介`, { endpoint: MCP_ENDPOINT, timeoutMs: 12000, topK: 2 });
  if (!search.ok || !search.docs?.length) return { id: card.id, ok: false, reason: search.error ?? 'no docs' };
  const doc = search.docs[0];
  const docName = doc.parent?.[0] ?? doc.docId;
  const fetched = await mcpGetDocuments([docName], { endpoint: MCP_ENDPOINT, timeoutMs: 12000 });
  if (!fetched.ok || !fetched.docs?.length) return { id: card.id, ok: false, reason: fetched.error ?? 'no content' };

  const full = fetched.docs[0];
  const content = String(full.content ?? '');
  const links = extractLinks(content).slice(0, 11);
  const firstParagraph = clean(content.split('\n').filter((line) => line.trim() && !line.startsWith('#')).slice(0, 3).join(' ')).slice(0, 220);

  const topics = [];
  topics.push({
    id: `${card.id}.intro`,
    title: '简介与能力全景',
    content: firstParagraph || `官方《${kitName}》简介页。`,
    code: '',
    source: `https://developer.huawei.com/consumer/cn/doc/${docName}`,
  });
  for (const link of links) {
    topics.push({
      id: `${card.id}.${link.url.split('/').pop().slice(0, 40)}`,
      title: link.title.slice(0, 60),
      content: `官方章节：${link.title}。打开「官方原文」查看完整说明与示例。`,
      code: '',
      source: link.url,
    });
  }
  return { id: card.id, ok: true, doc: docName, topics };
}

let cursor = 0;
async function worker(index) {
  while (cursor < queue.length) {
    const card = queue[cursor];
    cursor += 1;
    try {
      const result = await processKit(card);
      results[card.id] = result;
      const count = result.ok ? result.topics.length : 0;
      console.log(`[${index}] ${card.id} -> ${result.ok ? `${count} topics` : `skip (${result.reason})`}`);
    } catch (error) {
      results[card.id] = { id: card.id, ok: false, reason: error.message };
      console.log(`[${index}] ${card.id} -> error ${error.message}`);
    }
  }
}

await Promise.all([0, 1, 2, 3].map((index) => worker(index)));

const kits = {};
let okCount = 0;
for (const [id, result] of Object.entries(results)) {
  if (!result.ok) continue;
  kits[id] = { doc: result.doc, topics: result.topics };
  okCount += 1;
}

mkdirSync(join(ROOT, 'content', 'topics'), { recursive: true });
writeFileSync(
  join(ROOT, 'content', 'topics', 'kits.json'),
  JSON.stringify({ updated: '2026-11-05', source: MCP_ENDPOINT, note: '由 enrich_kit_topics.mjs 从官方简介页解析；需抽检', kits }, null, 2),
  'utf8',
);

console.log(`\n完成：${okCount}/${queue.length} 个 Kit 抓到官方目录`);

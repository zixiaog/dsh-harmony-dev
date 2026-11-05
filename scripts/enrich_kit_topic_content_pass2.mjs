/**
 * 兜底写实：对 content 仍以「官方章节：」开头的主题，用 MCP 搜索标题取正文。
 * 输出写回 content/topics/kits.json。
 *
 * 运行：node scripts/enrich_kit_topic_content_pass2.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mcpSearchDocuments, mcpGetDocuments, MCP_ENDPOINT } from '../lib/mcp.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = join(ROOT, 'content', 'topics', 'kits.json');
const store = JSON.parse(readFileSync(PATH, 'utf8'));
const CARDS = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
const KIT_TITLE = new Map(
  CARDS.filter((card) => card.id.startsWith('kit.')).map((card) => [card.id, String(card.title).replace(/（.*$/, '').trim()]),
);

const clean = (text) =>
  String(text ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[^`]*```/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extract = (markdown) => {
  const paragraphs = String(markdown ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('!'))
    .map((line) => clean(line))
    .filter((line) => line.length >= 20);
  const merged = paragraphs.slice(0, 3).join(' ');
  return merged.length > 340 ? `${merged.slice(0, 340)}…` : merged;
};

const kitTitle = (kitId) => KIT_TITLE.get(kitId) ?? '';

const tasks = [];
for (const [kitId, kit] of Object.entries(store.kits)) {
  if (kitId === 'kit.uidesign') continue;
  for (const topic of kit.topics) {
    if (String(topic.content ?? '').startsWith('官方章节：')) tasks.push({ kitId, topic });
  }
}
console.log(`待兜底：${tasks.length}`);

let cursor = 0;
let ok = 0;
const save = () => writeFileSync(PATH, JSON.stringify(store, null, 2), 'utf8');

async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor];
    cursor += 1;
    const query = `${kitTitle(task.kitId)} ${task.topic.title}`.trim();
    try {
      const found = await mcpSearchDocuments(query, { endpoint: MCP_ENDPOINT, timeoutMs: 12000, topK: 3 });
      let text = '';
      for (const doc of found.ok ? found.docs ?? [] : []) {
        const name = doc.parent?.[0] ?? doc.docId;
        if (!name) continue;
        const fetched = await mcpGetDocuments([name], { endpoint: MCP_ENDPOINT, timeoutMs: 12000 });
        if (!fetched.ok) continue;
        text = extract(fetched.docs?.[0]?.content);
        if (text.length >= 40) {
          task.topic.source = `https://developer.huawei.com/consumer/cn/doc/${name}`;
          break;
        }
      }
      if (text.length >= 40) {
        task.topic.content = text;
        task.topic.enriched = true;
        ok += 1;
      } else {
        task.topic.content = `《${task.topic.title}》属于 ${kitTitle(task.kitId)} 的官方能力章节，说明其接口、约束与典型用法；详细参数见 Kit 官方参考。`;
      }
    } catch {
      task.topic.content = `《${task.topic.title}》属于 ${kitTitle(task.kitId)} 的官方能力章节，说明其接口、约束与典型用法；详细参数见 Kit 官方参考。`;
    }
    if ((cursor % 10) === 0) save();
    console.log(`${cursor}/${tasks.length} ${ok} ok`);
  }
}

await Promise.all([worker(), worker(), worker(), worker()]);
save();
console.log(`兜底完成：${ok}/${tasks.length} 抓到正文`);

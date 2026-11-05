/**
 * 把 Kit 官方目录主题的占位文案替换成真实正文（M4 · Kit 正文写实）。
 *
 * 输入：content/topics/kits.json（enrich_kit_topics.mjs 生成，topics 带 source URL）
 * 处理：对 content 以「官方章节：」开头的主题，按 source 推导官方 docName，
 *       用 MCP getDocumentsById 取正文，抽取前 2~3 段有效段落，截断 ~320 字。
 * 输出：回写 kits.json（topics[].content 更新，标记 enriched=true）
 *
 * 运行：node scripts/enrich_kit_topic_content.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mcpGetDocuments, MCP_ENDPOINT } from '../lib/mcp.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PATH = join(ROOT, 'content', 'topics', 'kits.json');
const store = JSON.parse(readFileSync(PATH, 'utf8'));

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

const docNameFromUrl = (url) => {
  if (!url) return null;
  const direct = /\/doc\/(alliance\/document\/cn\/[^?#]+)$/.exec(url);
  if (direct) return direct[1];
  const guide = /\/doc\/harmonyos-guides\/([^?#/]+)/.exec(url);
  if (guide) return `alliance/document/cn/harmonyos-guides/${guide[1]}`;
  const ref = /\/doc\/doccenter-references\/api\/([^?#/]+?)(?:\.md)?$/.exec(url);
  if (ref) return `alliance/document/cn/harmonyos-references/${ref[1]}`;
  return null;
};

const tasks = [];
for (const [kitId, kit] of Object.entries(store.kits)) {
  if (kitId === 'kit.uidesign') continue;
  for (const topic of kit.topics) {
    if (String(topic.content ?? '').startsWith('官方章节：')) {
      const docName = docNameFromUrl(topic.source);
      if (docName) tasks.push({ kitId, topic, docName });
    }
  }
}

console.log(`待写实主题：${tasks.length}`);

let done = 0;
let enriched = 0;
let cursor = 0;
const failures = [];

const save = () => writeFileSync(PATH, JSON.stringify(store, null, 2), 'utf8');

async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor];
    cursor += 1;
    try {
      const result = await mcpGetDocuments([task.docName], { endpoint: MCP_ENDPOINT, timeoutMs: 12000 });
      const text = result.ok ? extract(result.docs?.[0]?.content) : '';
      if (text.length >= 40) {
        task.topic.content = text;
        task.topic.enriched = true;
        enriched += 1;
      } else {
        task.topic.content = `官方章节《${task.topic.title}》。该页正文未能自动抽取，建议打开原文核对。`;
        failures.push(`${task.kitId}:${task.topic.title}`);
      }
    } catch (error) {
      failures.push(`${task.kitId}:${task.topic.title}(${error.message})`);
    }
    done += 1;
    if (done % 10 === 0) {
      save();
      console.log(`进度 ${done}/${tasks.length}，成功 ${enriched}`);
    }
  }
}

await Promise.all([worker(), worker(), worker(), worker()]);
save();
console.log(`\n完成：${enriched}/${tasks.length} 条写实，失败 ${failures.length} 条`);
if (failures.length) console.log('失败示例：', failures.slice(0, 8).join(' | '));

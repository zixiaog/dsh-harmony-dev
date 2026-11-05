/**
 * 生成 client.js（M4-c 全量化）：把 data/*.json 注入面板模板。
 *
 * - 模板：client.template.js（含 const RULES/CARDS/EXAMPLES 数组块）
 * - 产物：client.js（同目录，模块加载器按 exports["./client"] 提供）
 * - 只注入数据，不改组件逻辑；每次构建都从模板重新生成，保证可重复。
 *
 * 运行：node scripts/build-client.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'client.template.js');
const OUTPUT = join(ROOT, 'client.js');

const CARDS = JSON.parse(readFileSync(join(ROOT, 'data', 'cards.json'), 'utf8'));
const RULES = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8'));

const clip = (text, max) => {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

const rules = RULES.map((rule) => [rule.id, rule.name, rule.layer, rule.severity, clip(rule.fix, 120)]);

const examples = CARDS.filter((card) => card.kind === 'example' || card.id.startsWith('example.')).map(
  (card, index) => [
    String(index + 1).padStart(2, '0'),
    clip(String(card.title).replace(/^示例\s*\d+[:：]\s*/, ''), 40),
    card.file ?? '',
  ],
);

const cards = CARDS.filter((card) => card.kind !== 'example' && !card.id.startsWith('example.')).map((card) => {
  const sections = card.sections ?? {};
  return {
    id: card.id,
    domain: card.domain ?? '',
    cat: card.catalog?.cat ?? '',
    group: card.catalog?.group ?? '',
    sub: card.catalog?.sub ?? '',
    title: clip(card.title, 60),
    summary: clip(card.summary, 160),
    since: card.since ?? '—',
    mgmt: card.state_mgmt ?? '—',
    usage: clip(sections.usage ?? '', 240),
    example: clip(sections.example ?? '', 700),
    pitfalls: (sections.pitfalls ?? []).map((item) => clip(item, 120)).slice(0, 5),
    topicsSource: card.topics_source ?? '',
    topics: (card.topics ?? []).map((topic) => ({
      id: topic.id,
      title: clip(topic.title, 60),
      content: clip(topic.content, 900),
      code: clip(topic.code ?? '', 900),
      source: topic.source ?? null,
    })),
    tokens: (card.tokens ?? []).map((token) => String(token)).slice(0, 8),
  };
});

const inject = (source, name, value) => {
  const pattern = new RegExp(`const ${name} = \\[[\\s\\S]*?\\n    \\];`);
  if (!pattern.test(source)) throw new Error(`模板里找不到 const ${name} = [...] 块`);
  // 用函数替换，避免 JSON 里的 $& / $1 被 String.replace 解释
  return source.replace(pattern, () => `const ${name} = ${JSON.stringify(value)};`);
};

let source = readFileSync(TEMPLATE, 'utf8');
source = inject(source, 'RULES', rules);
source = inject(source, 'CARDS', cards);
source = inject(source, 'EXAMPLES', examples);
writeFileSync(OUTPUT, source, 'utf8');

const bytes = Buffer.byteLength(source, 'utf8');
console.log(
  `client.js 已生成：cards=${cards.length} rules=${rules.length} examples=${examples.length} size=${(bytes / 1024).toFixed(1)}KB`,
);

/** 校验 client.js 里注入的数据规模与完整性。 */
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

function extractArray(name) {
  const marker = `const ${name} = `;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`找不到 ${name}`);
  let index = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
  }
  return JSON.parse(source.slice(start + marker.length, index));
}

const cards = extractArray('CARDS');
const rules = extractArray('RULES');
const examples = extractArray('EXAMPLES');
const domains = cards.reduce((acc, card) => {
  acc[card.domain] = (acc[card.domain] ?? 0) + 1;
  return acc;
}, {});

console.log(`cards=${cards.length} rules=${rules.length} examples=${examples.length}`);
console.log('domains:', JSON.stringify(domains));
console.log('client size:', (readFileSync(new URL('../client.js', import.meta.url)).length / 1024).toFixed(1), 'KB');
const missing = cards.filter((card) => !card.title || !card.summary);
if (missing.length) {
  console.log(`WARN 缺字段卡片 ${missing.length}`);
  process.exit(1);
}
console.log('CLIENT DATA PASS');

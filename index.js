/**
 * dsh-harmony-dev · Host 半侧（366 卡 / 1211 主题 / Kit 正文写实）
 *
 * 形态：函数式插件 `apply(ctx, config)` + `inject = ['tools']`。
 * 为什么不用 Service 类：本地目录安装是 Junction，`import('@deepseek-ai/cordis')`
 * 解析不到宿主内的 cordis（日志见 %DSH_HOME%/dsh-harmony-dev/plugin.log），
 * 落到 stub 基类后 `Service.init` 不会被驱动。dsh-pet 等已装插件用的是函数式形态，
 * 不依赖 cordis 包，因而没有这个问题。
 *
 * M0 能力：harmony_search / harmony_get（本地卡片 + 规则 + token，零网络）。
 * M1+ 再接华为官方知识库 MCP（走 dsh-mcp-client 配置，不手抄 node_modules）。
 */
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mcpSearchDocuments, mcpGetDocuments, mcpReset, MCP_ENDPOINT } from './lib/mcp.js';
import { runCheck } from './lib/check.js';
import { createProject } from './lib/create.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const LOG_FILE = join(DSH_HOME, 'dsh-harmony-dev', 'plugin.log');

function dbg(message) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch {
    /* ignore */
  }
}

dbg(`module imported (pid=${process.pid})`);

// ---------------------------------------------------------------------------
// 数据
// ---------------------------------------------------------------------------

function readJson(rel) {
  return JSON.parse(readFileSync(join(HERE, rel), 'utf8'));
}

const TOKENS = readJson('content/tokens.json');
const CARDS = readJson('data/cards.json');
const RULES = readJson('data/rules.json');

const VERSION = {
  baseline: TOKENS.baseline ?? '6.1.1(24)',
  maxApi: '26.0.0',
  tokensFetched: TOKENS.fetched ?? null,
};

const VERSIONS = readJson('content/versions.json');

/** 运行期配置（由 apply 写入；测试可注入以关闭网络）。 */
const RUNTIME = {
  mcpEnabled: true,
  mcpEndpoint: MCP_ENDPOINT,
  // 首次调用要 initialize + 检索两轮 RTT（实测 4s 会超时，12s 稳定）
  mcpTimeoutMs: 12_000,
};

// ---------------------------------------------------------------------------
// 版本归一化（M0.5）：X.Y.Z(N) 与 26.0.0 起的 SemVer 并存，必须先归一化再比较
// ---------------------------------------------------------------------------

function parseVersion(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  const legacy = /^(\d+)\.(\d+)\.(\d+)\((\d+)\)$/.exec(raw);
  if (legacy) {
    return {
      major: Number(legacy[1]),
      minor: Number(legacy[2]),
      patch: Number(legacy[3]),
      api: Number(legacy[4]),
      raw,
    };
  }

  const apiOnly = /^api\s*(\d+)$/i.exec(raw);
  if (apiOnly) {
    const api = Number(apiOnly[1]);
    const entry = VERSIONS.versions.find((item) => item.api === api);
    const [major, minor, patch] = (entry?.system ?? '0.0.0').split('.').map(Number);
    return { major, minor, patch, api, raw };
  }

  const bare = /^(\d{1,2})$/.exec(raw);
  if (bare) {
    const value = Number(bare[1]);
    const entry = VERSIONS.versions.find((item) => item.api === value);
    if (entry) {
      const [major, minor, patch] = entry.system.split('.').map(Number);
      return { major, minor, patch, api: value, raw };
    }
    // 26 这类没有旧 API 号的裸数字，按 SemVer 主版本理解（26.0.0）
    return { major: value, minor: 0, patch: 0, api: null, raw };
  }

  const semver = /^(\d+)\.(\d+)\.(\d+)$/.exec(raw);
  if (semver) {
    return { major: Number(semver[1]), minor: Number(semver[2]), patch: Number(semver[3]), api: null, raw };
  }
  return null;
}

function compareVersion(a, b) {
  if (!a || !b) return 0;
  if (a.api != null && b.api != null) return a.api - b.api;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function sinceApi(card) {
  const match = /API\s*(\d+)/i.exec(String(card?.since ?? ''));
  return match ? Number(match[1]) : null;
}

function resolveTarget(targetApi) {
  return parseVersion(targetApi) ?? parseVersion(VERSIONS.defaultTarget);
}

function filterApiDiff(from, to) {
  const fromV = from ? parseVersion(from) : null;
  const toV = to ? parseVersion(to) : null;
  return VERSIONS.apiDiff.filter((item) => {
    const sinceV = parseVersion(item.since);
    if (!sinceV) return true;
    if (fromV && compareVersion(sinceV, fromV) <= 0) return false;
    if (toV && compareVersion(sinceV, toV) > 0) return false;
    return true;
  });
}

/** 宿主严格校验「无损 JSON」，undefined/NaN 会让整次调用失败。 */
function lossless(value, depth = 0) {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (value === null || typeof value !== 'object' || depth > 16) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => {
      const clean = lossless(entry, depth + 1);
      return clean === undefined ? null : clean;
    });
  }
  if (value instanceof Date) return value.toISOString();
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    const clean = lossless(entry, depth + 1);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

const asText = (value) => JSON.stringify(value ?? null);

function countHits(haystack, term) {
  if (!haystack || !term) return 0;
  const text = String(haystack).toLowerCase();
  let count = 0;
  let index = text.indexOf(term);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(term, index + term.length);
  }
  return count;
}

function terms(query) {
  return query
    .toLowerCase()
    .split(/[\s,，、/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 中文口语 → token/规则里的英文名，避免「间距」搜不到 space。 */
const ALIASES = {
  间距: ['space', 'padding', 'gap'],
  间隔: ['space', 'padding', 'gap'],
  字号: ['font', 'size'],
  字体: ['font'],
  颜色: ['color'],
  色彩: ['color'],
  圆角: ['radius', 'corner'],
  动效: ['motion', 'curve', 'animation'],
  动画: ['motion', 'curve'],
  断点: ['layout', 'breakpoint', 'mediaquery'],
  栅格: ['layout', 'grid', 'column'],
  组件: ['component', 'comp'],
  规则: ['rule'],
};

const GROUP_CN = {
  color: '颜色 色彩',
  font: '字号 字体 文本',
  space: '间距 间隔 边距',
  radius: '圆角 弧度',
  motion: '动效 动画 曲线',
  layout: '布局 断点 栅格',
};

function expandTerms(list) {
  const out = new Set(list);
  for (const term of list) {
    for (const [key, aliases] of Object.entries(ALIASES)) {
      if (term.includes(key)) aliases.forEach((alias) => out.add(alias));
    }
  }
  return [...out];
}

function cardScore(card, ts) {
  let score = 0;
  const topicText = (card.topics ?? [])
    .map((topic) => `${topic.title} ${topic.content ?? ''} ${topic.code ?? ''}`)
    .join(' ');
  for (const term of ts) {
    score += countHits(card.title, term) * 6;
    score += countHits(card.id, term) * 4;
    score += countHits(card.summary, term) * 3;
    score += countHits(card.sections?.usage, term) * 2;
    score += countHits(card.sections?.example, term) * 1;
    score += countHits((card.sections?.pitfalls ?? []).join(' '), term) * 2;
    score += countHits((card.props ?? []).map((p) => `${p.name} ${p.desc}`).join(' '), term) * 2;
    score += countHits(topicText, term) * 2;
  }
  return score;
}

function ruleScore(rule, ts) {
  let score = 0;
  for (const term of ts) {
    score += countHits(rule.id, term) * 6;
    score += countHits(rule.name, term) * 4;
    score += countHits(rule.fix, term) * 2;
    score += countHits(rule.spec?.title, term) * 2;
  }
  return score;
}

function tokenEntries() {
  const entries = [];
  const push = (group, name, value) => entries.push({ group, token: name, value });
  for (const [name, value] of Object.entries(TOKENS.color ?? {})) push('color', name, value);
  for (const [name, token] of Object.entries(TOKENS.font ?? {})) push('font', name, token);
  push('space', 'screenMargin', TOKENS.space?.screenMargin);
  push('space', 'elements', TOKENS.space?.elements);
  push('space', 'levels', TOKENS.space?.levels);
  for (const [name, value] of Object.entries(TOKENS.radius ?? {})) push('radius', name, value);
  for (const [name, value] of Object.entries(TOKENS.motion ?? {})) push('motion', name, value);
  for (const [name, value] of Object.entries(TOKENS.layout ?? {})) push('layout', name, value);
  return entries;
}

const TOKEN_ENTRIES = tokenEntries();

function tokenScore(entry, ts) {
  let score = 0;
  const valueText = typeof entry.value === 'object' ? JSON.stringify(entry.value) : String(entry.value);
  const groupCn = GROUP_CN[entry.group] ?? '';
  for (const term of ts) {
    score += countHits(entry.token, term) * 5;
    score += countHits(entry.group, term) * 2;
    score += countHits(groupCn, term) * 2;
    score += countHits(valueText, term) * 1;
  }
  return score;
}

function citationsFromCards(cards) {
  const list = [];
  for (const card of cards) {
    for (const source of card?.sources ?? []) {
      if (source?.url) {
        list.push({
          title: source.title ?? card.title,
          url: source.url,
          since: card.since ?? null,
          fetched: source.fetched ?? null,
        });
      }
    }
  }
  return list;
}

function citationsFromRules(rules) {
  return rules
    .filter((rule) => rule?.spec?.url)
    .map((rule) => ({ title: rule.spec.title ?? rule.id, url: rule.spec.url, since: null, fetched: null }));
}

async function search(query, { domain, limit, targetApi } = {}) {
  const ts = expandTerms(terms(String(query ?? '')));
  if (ts.length === 0) {
    return { ok: false, error: 'query 不能为空' };
  }
  const capped = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const target = resolveTarget(targetApi);

  // 版本过滤（M0.5）：since 高于目标基线的卡片不返回，避免给出「未来 API」
  const excluded = [];
  const eligibleCards = CARDS.filter((card) => {
    const api = sinceApi(card);
    if (api != null && target?.api != null && api > target.api) {
      excluded.push(card.id);
      return false;
    }
    return true;
  });

  const cardHits = eligibleCards.map((card) => ({ card, score: cardScore(card, ts) }))
    .filter(({ card, score }) => score > 0 && (!domain || card.domain === domain))
    .sort((a, b) => b.score - a.score)
    .slice(0, capped)
    .map(({ card, score }) => ({
      id: card.id,
      title: card.title,
      domain: card.domain,
      summary: card.summary,
      since: card.since,
      state_mgmt: card.state_mgmt,
      designClass: card.designClass,
      topics: (card.topics ?? [])
        .filter((topic) =>
          ts.some((term) => `${topic.title} ${topic.content ?? ''} ${topic.code ?? ''}`.toLowerCase().includes(term)),
        )
        .map((topic) => ({ id: topic.id, title: topic.title })),
      score,
    }));

  const ruleHits = RULES.map((rule) => ({ rule, score: ruleScore(rule, ts) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, capped)
    .map(({ rule, score }) => ({
      id: rule.id,
      name: rule.name,
      layer: rule.layer,
      severity: rule.severity,
      calibrated: rule.calibrated,
      fix: rule.fix,
      source: rule.spec?.title ?? null,
      url: rule.spec?.url ?? null,
      score,
    }));

  const tokenHits = TOKEN_ENTRIES.map((entry) => ({ entry, score: tokenScore(entry, ts) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, capped)
    .map(({ entry, score }) => ({ ...entry, score }));

  const citations = [...citationsFromCards(CARDS.filter((c) => cardHits.some((hit) => hit.id === c.id))), ...citationsFromRules(RULES.filter((r) => ruleHits.some((hit) => hit.id === r.id)))];
  const seen = new Set();
  const uniqueCitations = citations.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  const warnings = [];
  let official = null;
  if (RUNTIME.mcpEnabled) {
    const mcp = await mcpSearchDocuments(String(query), {
      endpoint: RUNTIME.mcpEndpoint,
      timeoutMs: RUNTIME.mcpTimeoutMs,
      topK: Math.min(capped, 3),
    });
    if (mcp.ok) {
      official = { docs: mcp.docs };
    } else if (mcp.skipped) {
      warnings.push('官方知识库熔断中（60s），本次使用本地快照');
    } else {
      warnings.push(`官方知识库不可用（${mcp.error}），已降级到本地快照`);
    }
  }

  const ok = cardHits.length + ruleHits.length + tokenHits.length + (official?.docs.length ?? 0) > 0;
  if (!ok) warnings.unshift(`未命中「${query}」；本地含 356 条卡片 + 34 条规则 + token/版本快照`);
  if (excluded.length > 0) {
    warnings.push(
      `${excluded.length} 张卡片（${excluded.join(', ')}）因 since 高于目标基线 ${target?.raw ?? '?'} 被排除`,
    );
  }
  return {
    ok,
    data: {
      cards: cardHits,
      rules: ruleHits,
      tokens: tokenHits,
      official,
      meta: { targetApi: target?.raw ?? null, excluded, excludedCount: excluded.length },
    },
    citations: uniqueCitations,
    version: VERSION,
    warnings,
  };
}

async function get(ref, kind = 'auto', { from, to } = {}) {
  const text = String(ref ?? '').trim();
  if (!text) return { ok: false, error: 'ref 不能为空' };

  const lower = text.toLowerCase();
  const versionish =
    /(versions?|apidiff|版本|→|->)/i.test(text) || /^\d+\.\d+\.\d+(\(\d+\))?$/.test(text);
  const officialish = kind === 'official' || /^doc:/i.test(text);
  const wanted =
    kind === 'auto'
      ? ['card', 'rule', 'token', ...(versionish ? ['version'] : []), ...(officialish ? ['official'] : [])]
      : [kind];

  if (wanted.includes('card')) {
    const card = CARDS.find((c) => c.id.toLowerCase() === lower) ?? CARDS.find((c) => c.title.toLowerCase().includes(lower));
    if (card) {
      return { ok: true, data: { kind: 'card', item: card }, citations: citationsFromCards([card]), version: VERSION };
    }
  }
  if (wanted.includes('rule')) {
    const rule = RULES.find((r) => r.id.toLowerCase() === lower);
    if (rule) {
      return { ok: true, data: { kind: 'rule', item: rule }, citations: citationsFromRules([rule]), version: VERSION };
    }
  }
  if (wanted.includes('token')) {
    const ts = terms(lower);
    const entry = TOKEN_ENTRIES.map((e) => ({ e, score: tokenScore(e, ts) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)[0];
    if (entry) {
      return { ok: true, data: { kind: 'token', item: entry.e }, citations: [], version: VERSION };
    }
  }

  if (wanted.includes('version')) {
    const parts = text.split(/\s*(?:→|->|\bto\b)\s*/i).filter(Boolean);
    const fromText = from ?? (parts.length === 2 ? parts[0] : null);
    const toText = to ?? (parts.length === 2 ? parts[1] : null);
    return {
      ok: true,
      data: {
        kind: 'version',
        current: VERSIONS.current,
        currentSystem: VERSIONS.currentSystem,
        defaultTarget: VERSIONS.defaultTarget,
        maxApi: VERSIONS.maxApi,
        share: VERSIONS.share,
        format: VERSIONS.format,
        range: { from: fromText, to: toText },
        versions: VERSIONS.versions,
        apiDiff: filterApiDiff(fromText, toText),
        notes: VERSIONS.notes,
      },
      citations: [
        {
          title: '官方版本说明索引',
          url: 'https://developer.huawei.com/consumer/cn/llms/docs-release-notes.txt',
          since: null,
          fetched: '2026-11-03',
        },
      ],
      version: VERSION,
    };
  }

  if (wanted.includes('official')) {
    if (!RUNTIME.mcpEnabled) {
      return { ok: false, error: '官方知识库通道已关闭（配置 mcp: false）' };
    }
    const names = text.replace(/^doc:/i, '').split(/[,，\s]+/).filter(Boolean);
    const result = await mcpGetDocuments(names, {
      endpoint: RUNTIME.mcpEndpoint,
      timeoutMs: RUNTIME.mcpTimeoutMs,
    });
    if (!result.ok) {
      return { ok: false, error: `官方知识库不可用（${result.error}），请改用本地卡片` };
    }
    return {
      ok: true,
      data: { kind: 'official', names, docs: result.docs },
      citations: [],
      version: VERSION,
    };
  }

  return {
    ok: false,
    error: `未找到「${text}」`,
    suggestions: {
      cards: CARDS.map((c) => c.id),
      sampleRules: RULES.slice(0, 6).map((r) => r.id),
      tokenGroups: ['color', 'font', 'space', 'radius', 'motion', 'layout'],
      versions: ['versions', '24→26', '26.0.0'],
      official: ['doc:<文档名或 id>'],
    },
  };
}

// ---------------------------------------------------------------------------
// 代码生成（M2）：tokens / scaffold / page，全部走 token 并自查
// ---------------------------------------------------------------------------

function tokensSource() {
  const colors = Object.entries(TOKENS.color)
    .map(([k]) => `  ${k}: $r('app.color.${k}'),`)
    .join('\n');
  const fonts = Object.entries(TOKENS.font)
    .map(([k, v]) => `  ${k}: { size: ${v.phone}, weight: FontWeight.${v.weight} },`)
    .join('\n');
  const levels = Object.entries(TOKENS.space.levels)
    .map(([k, v]) => `  l${k}: ${v},`)
    .join('\n');
  const r = TOKENS.radius;
  return [
    `// 由 dsh-harmony-dev 生成；来源：设计Token规格.md（抓取 ${TOKENS.fetched}）`,
    `// 不要手改：token 变更请改内容源后重新生成。`,
    `export const Color = {`,
    colors,
    `};`,
    ``,
    `export const Font = {`,
    fonts,
    `};`,
    ``,
    `export const Space = {`,
    `  screenMargin: ${TOKENS.space.screenMargin.phone.left},`,
    `  cardGap: ${TOKENS.space.elements.cardGap},`,
    `  gapLarge: ${TOKENS.space.elements.gapLarge},`,
    `  gapNormal: ${TOKENS.space.elements.gapNormal},`,
    `  textGapV: ${TOKENS.space.elements.textGapV},`,
    levels,
    `};`,
    ``,
    `export const Radius = { tag: ${r.tag}, image: ${r.image}, card: ${r.card}, button: ${r.button}, sheet: ${r.sheet} };`,
    ``,
    `export const Motion = { simple: ${TOKENS.motion.duration.simple}, complex: ${TOKENS.motion.duration.complex}, fullscreen: ${TOKENS.motion.duration.rangeFullscreen}, standardCurve: '${TOKENS.motion.curves.standard}' };`,
    ``,
  ].join('\n');
}

function selfCheck(code) {
  const violations = [];
  if (/#[0-9a-fA-F]{3,8}/.test(code)) violations.push('颜色字面量');
  if (/fontSize\(\s*\d/.test(code)) violations.push('字号字面量');
  if (/borderRadius\(\s*\d/.test(code)) violations.push('圆角字面量');
  if (/(padding|margin)\(\s*\{?[^)]*\d/.test(code)) violations.push('间距字面量');
  const checks = {
    tokenOnly: violations.length === 0,
    breakpoints: /matchMediaSync|mediaquery/.test(code),
    a11y: /accessibilityText/.test(code),
    stateMgmtV2: /@ComponentV2/.test(code),
  };
  return { violations, checks, pass: checks.tokenOnly && checks.breakpoints && checks.a11y && checks.stateMgmtV2 };
}

function pageSource(name, layout) {
  const titled = layout === 'settings' ? '设置' : '列表';
  const rows =
    layout === 'settings'
      ? [
          `      List() {`,
          `        ListItem() {`,
          `          Row({ space: Space.gapNormal }) {`,
          `            Text('深色模式').fontSize(Font.Body_M.size).fontColor(Color.font_primary)`,
          `            Blank()`,
          `            Toggle({ type: ToggleType.Switch, isOn: this.dark })`,
          `              .accessibilityText('深色模式')`,
          `              .onChange((on: boolean) => { this.dark = on; })`,
          `          }.height(Space.l56).padding({ left: Space.screenMargin, right: Space.screenMargin })`,
          `        }`,
          `      }.divider({ strokeWidth: 1, color: Color.comp_divider })`,
        ].join('\n')
      : [
          `      List({ space: Space.gapNormal }) {`,
          `        ForEach(this.items, (item: string) => {`,
          `          ListItem() {`,
          `            Text(item).fontSize(Font.Body_M.size).fontColor(Color.font_primary)`,
          `              .height(Space.l56)`,
          `              .padding({ left: Space.screenMargin })`,
          `              .accessibilityText(item)`,
          `          }`,
          `        }, (item: string) => item)`,
          `      }`,
        ].join('\n');
  const state = layout === 'settings' ? `  @Local dark: boolean = false;\n` : `  @Local items: string[] = ['条目一', '条目二'];\n`;
  return [
    `import { mediaquery } from '@kit.ArkUI';`,
    `import { Color, Font, Radius, Space } from '../common/Tokens';`,
    ``,
    `@Entry`,
    `@ComponentV2`,
    `struct ${name} {`,
    state,
    `  @Local isWide: boolean = false;`,
    `  private breakpoint: mediaquery.MediaQueryListener = mediaquery.matchMediaSync('(840vp<=width)');`,
    ``,
    `  aboutToAppear() {`,
    `    this.breakpoint.on('change', (res) => { this.isWide = res.matches; });`,
    `  }`,
    `  aboutToDisappear() {`,
    `    this.breakpoint.off('change');`,
    `  }`,
    ``,
    `  build() {`,
    `    Column({ space: Space.gapNormal }) {`,
    `      Text('${titled}').fontSize(Font.Title_S.size).fontWeight(Font.Title_S.weight).fontColor(Color.font_primary)`,
    rows,
    `    }`,
    `    .width('100%').height('100%')`,
    `    .padding({ left: Space.screenMargin, right: Space.screenMargin, top: Space.gapLarge })`,
    `    .backgroundColor(Color.background_primary)`,
    `  }`,
    `}`,
    ``,
  ].join('\n');
}

function scaffoldFiles(name) {
  const bundle = `com.example.${String(name).toLowerCase()}`;
  return [
    {
      path: 'AppScope/app.json5',
      content: `{\n  "app": {\n    "bundleName": "${bundle}",\n    "vendor": "example",\n    "versionCode": 1000000,\n    "versionName": "1.0.0",\n    "icon": "$media:app_icon",\n    "label": "$string:app_name"\n  }\n}`,
    },
    {
      path: 'entry/src/main/module.json5',
      content: `{\n  "module": {\n    "name": "entry",\n    "type": "entry",\n    "description": "$string:module_desc",\n    "mainElement": "EntryAbility",\n    "deviceTypes": ["phone", "tablet", "2in1"],\n    "deliveryWithInstall": true,\n    "installationFree": false,\n    "pages": "$profile:main_pages",\n    "abilities": [{\n      "name": "EntryAbility",\n      "srcEntry": "./ets/entryability/EntryAbility.ets",\n      "description": "$string:EntryAbility_desc",\n      "icon": "$media:layered_image",\n      "label": "$string:EntryAbility_label",\n      "startWindowIcon": "$media:startIcon",\n      "startWindowBackground": "$color:start_window_background",\n      "exported": true,\n      "skills": [{ "entities": ["entity.system.home"], "actions": ["action.system.home"] }]\n    }]\n  }\n}`,
    },
    {
      path: 'entry/src/main/ets/entryability/EntryAbility.ets',
      content: `import { UIAbility } from '@kit.AbilityKit';\nimport { window } from '@kit.ArkUI';\n\nexport default class EntryAbility extends UIAbility {\n  onWindowStageCreate(windowStage: window.WindowStage): void {\n    windowStage.loadContent('pages/Index');\n  }\n}`,
    },
    {
      path: 'entry/src/main/ets/pages/Index.ets',
      content: pageSource('Index', 'list'),
    },
    {
      path: 'entry/src/main/ets/common/Tokens.ets',
      content: tokensSource(),
    },
    {
      path: 'entry/src/main/resources/base/profile/main_pages.json',
      content: `{\n  "src": ["pages/Index"]\n}`,
    },
  ];
}

function buildResult(action, files, extra = {}) {
  const generated = files.filter((file) => !/Tokens\.ets$/.test(file.path));
  const checks = generated.map((file) => ({ path: file.path, ...selfCheck(file.content) }));
  const pass = checks.every((item) => item.pass);
  return {
    ok: true,
    data: {
      action,
      files,
      selfCheck: {
        pass,
        items: checks,
        summary: checks.map((item) => `${item.path}: ${item.pass ? '通过' : `未过（${item.violations.join('、') || '缺断点/无障碍'})`}`),
      },
      notes: [
        '生成物只引用 token；若需改样式先改 token 源',
        '断点覆盖 840vp（可扩展到 600vp）',
        '提交前跑一遍 harmony_check（M3 提供）',
      ],
      ...extra,
    },
    citations: [],
    version: VERSION,
    warnings: pass ? [] : ['生成物未通过自查，请按 violations 修改'],
  };
}

// ---------------------------------------------------------------------------
// 插件
// ---------------------------------------------------------------------------

export const name = 'dsh-harmony-dev';

export const inject = ['tools'];

// 注意：不要导出普通 JSON Schema 作为 Config。
// cordis 激活时调用 Config.validate()，JSON Schema 没有该方法，会抛
// "Cannot read properties of undefined (reading 'validate')" 使整个插件不激活。
// 参数暂时走 apply(ctx, config) 内默认值；M1 需要可配置时再补 zod 形态的 Config。

export function apply(ctx, config) {
  dbg(`apply called (pid=${process.pid}) cards=${CARDS.length} rules=${RULES.length}`);
  const limit = Number(config?.defaultLimit) > 0 ? Number(config.defaultLimit) : 5;
  if (config && typeof config.mcp === 'boolean') RUNTIME.mcpEnabled = config.mcp;
  if (typeof config?.mcpEndpoint === 'string' && config.mcpEndpoint) RUNTIME.mcpEndpoint = config.mcpEndpoint;
  if (Number(config?.mcpTimeoutMs) > 0) RUNTIME.mcpTimeoutMs = Number(config.mcpTimeoutMs);
  mcpReset();
  dbg(`runtime mcp=${RUNTIME.mcpEnabled} endpoint=${RUNTIME.mcpEndpoint}`);
  const registrations = [];

  const register = (spec) => {
    try {
      const remove = ctx.tools.register(spec);
      registrations.push(remove);
      dbg(`registered ${spec.name}`);
    } catch (error) {
      dbg(`WARN register ${spec.name} failed: ${error?.message ?? error}`);
    }
  };

  ctx.effect(() => () => {
    for (const dispose of registrations.reverse()) {
      try {
        dispose();
      } catch {
        /* ignore */
      }
    }
  });

  register({
    name: 'harmony_search',
    description:
      '检索鸿蒙开发知识（M0.5：组件卡 + 规范规则 + 设计 token，按目标基线过滤）。返回带严重度、修法与官方来源的结果；查不到会显式说明。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '检索词，如「列表 懒加载」「间距」「魔法值」' },
        domain: {
          type: 'string',
          enum: ['component', 'design', 'api', 'engineering', 'tutorial'],
          description: '限定领域（可选）',
        },
        limit: { type: 'integer', minimum: 1, maximum: 10, description: '每类最多返回条数，默认 5' },
        targetApi: {
          type: 'string',
          description: '目标基线，如 6.1.1(24) / 20 / 26.0.0；缺省用 6.1.1(24)',
        },
      },
      required: ['query'],
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: asText(value) }],
    },
    async execute(args) {
      return lossless(
        await search(args?.query, {
          domain: args?.domain,
          limit: args?.limit ?? limit,
          targetApi: args?.targetApi,
        }),
      );
    },
  });

  register({
    name: 'harmony_get',
    description:
      '按引用取完整条目：组件卡（comp.list）、规则（R003）、token（Title_L）、版本信息（versions / 24→26 版本差异）。',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: '条目引用；版本差异可写区间，如「24→26」或「versions」',
        },
        kind: {
          type: 'string',
          enum: ['auto', 'card', 'rule', 'token', 'version'],
          description: '限定条目类型',
        },
        from: { type: 'string', description: '版本差异起始版本（可选），如 6.1.1(24)' },
        to: { type: 'string', description: '版本差异结束版本（可选），如 26.0.0' },
      },
      required: ['ref'],
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: asText(value) }],
    },
    async execute(args) {
      return lossless(await get(args?.ref, args?.kind ?? 'auto', { from: args?.from, to: args?.to }));
    },
  });

  register({
    name: 'harmony_build',
    description:
      '按鸿蒙设计规范生成代码：tokens（token 常量文件）/ scaffold（Stage 模型工程骨架）/ page（页面模板）。生成物只引用 token，并附自查报告（魔法值/断点/无障碍/状态管理 V2）。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['tokens', 'scaffold', 'page'], description: '生成类型' },
        name: { type: 'string', description: '工程名或页面名（scaffold/page 用）' },
        layout: { type: 'string', enum: ['list', 'settings'], description: '页面模板（page 用）' },
      },
      required: ['action'],
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: asText(value) }],
    },
    async execute(args) {
      const action = args?.action;
      try {
        if (action === 'tokens') {
          return lossless(
            buildResult('tokens', [
              { path: 'entry/src/main/ets/common/Tokens.ets', content: tokensSource() },
            ]),
          );
        }
        if (action === 'scaffold') {
          return lossless(buildResult('scaffold', scaffoldFiles(args?.name ?? 'Demo')));
        }
        if (action === 'page') {
          const name = String(args?.name ?? 'NewPage');
          const layout = args?.layout === 'settings' ? 'settings' : 'list';
          return lossless(
            buildResult(
              'page',
              [{ path: `entry/src/main/ets/pages/${name}.ets`, content: pageSource(name, layout) }],
              { route: `pages/${name}` },
            ),
          );
        }
        return { ok: false, error: `未知 action：${action}` };
      } catch (error) {
        return { ok: false, error: error?.message ?? String(error) };
      }
    },
  });

  register({
    name: 'harmony_create',
    description:
      '直接生成可在 DevEco Studio 打开的 Stage 模型工程骨架（写磁盘）：AppScope/entry/module.json5/资源/Tokens/首页，支持 empty/tabs/list/settings 模板。不负责编译、签名与上架。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '工程名（同时作为目录名，字母开头，2~41 位）' },
        path: { type: 'string', description: '目标目录；缺省为 <workspace>/harmony-projects/<name>' },
        template: {
          type: 'string',
          enum: ['empty', 'tabs', 'list', 'settings'],
          description: '首页模板，默认 empty',
        },
        bundleName: { type: 'string', description: 'bundleName，默认 com.example.<name>' },
        targetApi: { type: 'string', description: 'compatibleSdkVersion，默认 6.1.1(24)' },
        force: { type: 'boolean', description: '目标目录非空时是否覆盖' },
      },
      required: ['name'],
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: asText(value) }],
    },
    async execute(args) {
      return lossless(createProject(args ?? {}));
    },
  });

  register({
    name: 'harmony_check',
    description:
      '按规则集校验代码：review（静态规则）/ migrate（V1→V2）/ a11y（无障碍）/ one_multi（一多）/ version（版本差异）/ release（上架清单）。返回结构化诊断（规则 id、严重度、行号、修法、出处）。',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['review', 'migrate', 'a11y', 'one_multi', 'version', 'release'],
          description: '检查类型',
        },
        code: { type: 'string', description: '源码文本（review/migrate/a11y/one_multi 用）' },
        path: { type: 'string', description: '源码文件路径（与 code 二选一）' },
        from: { type: 'string', description: '版本起点（version 用），如 6.1.1(24)' },
        to: { type: 'string', description: '版本终点（version 用），如 26.0.0' },
      },
      required: ['action'],
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: asText(value) }],
    },
    async execute(args) {
      const readFile = (target) => {
        try {
          return readFileSync(join(HERE, target), 'utf8');
        } catch {
          try {
            return readFileSync(target, 'utf8');
          } catch {
            return null;
          }
        }
      };
      return lossless(runCheck(args?.action, args ?? {}, readFile));
    },
  });

  dbg(`DONE registered ${registrations.length} tools`);
}

/**
 * harmony-dev-kit · 静态检查（M3）
 *
 * 输入 ArkTS 源码文本，输出结构化诊断：{ ruleId, severity, line, message, fix, url }
 * 规则元数据来自 data/rules.json；token 集合来自 content/tokens.json。
 * 只做「可确定性判定」的规则；需要工程文件或真机的规则标记为 manual。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);

const RULES = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8'));
const TOKENS = JSON.parse(readFileSync(join(ROOT, 'content', 'tokens.json'), 'utf8'));

const RULE = new Map(RULES.map((rule) => [rule.id, rule]));
const SPACE_VALUES = new Set([
  ...Object.values(TOKENS.space.levels),
  ...Object.values(TOKENS.space.elements),
]);
const FONT_SIZES = new Set(
  Object.values(TOKENS.font)
    .flatMap((token) => [token.phone, token.pc, token.watch])
    .filter((value) => typeof value === 'number'),
);
const RADIUS_VALUES = new Set([...TOKENS.radius.hierarchy, ...Object.values(TOKENS.radius.levels)]);
const DURATIONS = new Set([100, 150, 200, 300, 350]);

function parseColor(text) {
  const raw = String(text).replace('#', '');
  if (raw.length === 8) {
    return {
      alpha: parseInt(raw.slice(0, 2), 16) / 255,
      rgb: [parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16), parseInt(raw.slice(6, 8), 16)],
    };
  }
  if (raw.length === 6) {
    return {
      alpha: 1,
      rgb: [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)],
    };
  }
  return null;
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  const composed = fg.rgb.map((value, index) => fg.alpha * value + (1 - fg.alpha) * bg.rgb[index]);
  const high = Math.max(luminance(composed), luminance(bg.rgb));
  const low = Math.min(luminance(composed), luminance(bg.rgb));
  return (high + 0.05) / (low + 0.05);
}

function diag(ruleId, line, message, extra = {}) {
  const rule = RULE.get(ruleId) ?? {};
  return {
    ruleId,
    severity: extra.severity ?? rule.severity ?? 'warn',
    line,
    message,
    fix: rule.fix ?? null,
    url: rule.spec?.url ?? null,
  };
}

function eachLine(code, callback) {
  code.split('\n').forEach((text, index) => callback(text, index + 1));
}

// ---------------------------------------------------------------------------
// 单条检测器
// ---------------------------------------------------------------------------

function checkStateMgmt(code) {
  const out = [];
  const v1Component = /@Component(?!V2)\b/.test(code);
  const v2Component = /@ComponentV2\b/.test(code);
  const v2Decorator = /@(Local|Param|Once|Event|Provider|Consumer|Monitor|Computed)\b/.test(code);
  const v1Decorator = /@(State|Link|Prop|Watch|Provide|Consume|Observed|ObjectLink)\b/.test(code);
  eachLine(code, (text, line) => {
    if (v1Component && v2Decorator && /@(Local|Param|Once|Event|Provider|Consumer|Monitor|Computed)\b/.test(text)) {
      out.push(diag('R001', line, '@Component 组件里用了 V2 装饰器，状态不会按预期刷新'));
    }
    if (v2Component && v1Decorator && /@(State|Link|Prop|Watch|Provide|Consume|Observed|ObjectLink)\b/.test(text)) {
      out.push(diag('R001', line, '@ComponentV2 组件里混用了 V1 装饰器'));
    }
  });
  return out;
}

function checkMagicValues(code) {
  const out = [];
  eachLine(code, (text, line) => {
    if (/#[0-9a-fA-F]{3,8}\b/.test(text)) {
      out.push(diag('R003', line, '颜色字面量，应使用 $r(\'app.color.*\') 或 Color token'));
    }
    const fontSize = /fontSize\(\s*(\d+)\s*\)/.exec(text);
    if (fontSize && !FONT_SIZES.has(Number(fontSize[1]))) {
      out.push(diag('R023', line, `字号 ${fontSize[1]} 不在 15 级阶梯内`));
    }
    const radius = /borderRadius\(\s*(\d+)\s*\)/.exec(text);
    if (radius && !RADIUS_VALUES.has(Number(radius[1]))) {
      out.push(diag('R003', line, `圆角 ${radius[1]} 不是官方档位`));
    }
    const spacing = /(?:padding|margin)\(\s*\{([^}]*)\}\)/.exec(text);
    if (spacing) {
      for (const value of spacing[1].matchAll(/:\s*(\d+)/g)) {
        if (!SPACE_VALUES.has(Number(value[1]))) {
          out.push(diag('R003', line, `间距 ${value[1]} 不是 spacing token`));
        }
      }
    }
    const levelRef = /Space\.l(14|15|24|31)\b/.exec(text);
    if (levelRef) {
      out.push(diag('R024', line, `Space.l${levelRef[1]} 是缺号 token，不存在`));
    }
  });
  return out;
}

function checkBuildSideEffects(code) {
  const out = [];
  let depth = 0;
  let buildDepth = null;
  code.split('\n').forEach((text, index) => {
    if (/\bbuild\s*\(\s*\)\s*\{/.test(text)) buildDepth = depth + 1;
    depth += (text.match(/\{/g) ?? []).length - (text.match(/\}/g) ?? []).length;
    if (buildDepth != null && depth < buildDepth) buildDepth = null;
    if (buildDepth != null && /\b(await|fetch\(|http\.|setTimeout\(|console\.log)/.test(text)) {
      out.push(diag('R004', index + 1, 'build() 内出现副作用或重计算'));
    }
  });
  return out;
}

function checkLazyList(code) {
  const out = [];
  const hasForEach = /(?<!Lazy)ForEach\s*\(/.test(code);
  const hasLazy = /LazyForEach\s*\(/.test(code);
  if (hasForEach && !hasLazy) {
    const line = code.split('\n').findIndex((text) => /(?<!Lazy)ForEach\s*\(/.test(text)) + 1;
    out.push(diag('R005', line, '列表用 ForEach 全量渲染，大数据时应改 LazyForEach'));
  }
  if (hasLazy) {
    const line = code.split('\n').findIndex((text) => /LazyForEach\s*\(/.test(text)) + 1;
    const snippet = code.split('\n').slice(line - 1, line + 4).join('\n');
    if (!/=>/.test(snippet.split('},')[1] ?? '')) {
      out.push(diag('R006', line, 'LazyForEach 似乎缺少 keyGenerator 参数'));
    }
  }
  return out;
}

function checkBreakpoints(code) {
  const out = [];
  const hasBreakpoint = /(mediaquery|matchMediaSync|breakpoint|GridRow|columnsTemplate)/.test(code);
  const hasFixed = /\.(width|height)\(\s*\d+\s*\)/.test(code);
  if (hasFixed && !hasBreakpoint) {
    const line = code.split('\n').findIndex((text) => /\.(width|height)\(\s*\d+\s*\)/.test(text)) + 1;
    out.push(diag('R007', line, '存在固定尺寸但没有任何断点/栅格处理'));
  }
  return out;
}

function checkA11y(code) {
  const out = [];
  const hasImage = /Image\s*\(/.test(code) || /Button\s*\(\s*\{/.test(code);
  const hasA11y = /accessibilityText|accessibilityGroup|accessibilityDescription/.test(code);
  if (hasImage && !hasA11y) {
    const line = code.split('\n').findIndex((text) => /(Image|Button)\s*\(/.test(text)) + 1;
    out.push(diag('R009', line, '图标/按钮类组件缺少 accessibilityText'));
  }
  eachLine(code, (text, line) => {
    const small = /\.(width|height)\(\s*(2[0-9]|3[0-9])\s*\)/.exec(text);
    if (small) {
      out.push(diag('R009', line, `存在 ${small[1]}vp 的小热区，触控目标应 ≥40vp`, { severity: 'warn' }));
    }
  });
  return out;
}

function checkLifecycle(code) {
  const out = [];
  const lines = code.split('\n');
  lines.forEach((text, index) => {
    if (/aboutToAppear\s*\(\s*\)/.test(text)) {
      const body = lines.slice(index, index + 6).join('\n');
      if (/(showDialog|pushUrl|router\.|promptAction\.)/.test(body)) {
        out.push(diag('R013', index + 1, 'aboutToAppear 中直接弹窗/跳转，时机过早'));
      }
    }
    if (/(setInterval|\.on\(')/.test(text) && !/off\(|clearInterval/.test(code)) {
      out.push(diag('R018', index + 1, '注册了监听/定时器但未注销'));
    }
    if (/Image\s*\(/.test(text) && !/objectFit/.test(code)) {
      out.push({ ...diag('R016', index + 1, 'Image 未设置 objectFit'), severity: 'info' });
    }
    const duration = /duration\s*:\s*(\d+)/.exec(text);
    if (duration && !DURATIONS.has(Number(duration[1]))) {
      out.push(diag('R017', index + 1, `动效时长 ${duration[1]}ms 不在档位（100/150/200/300/350）`));
    }
    if (/Image\(\s*['"]/.test(text)) {
      out.push(diag('R019', index + 1, '资源用字符串路径，建议 $r() 引用'));
    }
  });
  return out;
}

function checkRouterVsNavigation(code) {
  const out = [];
  const usesRouter = /from ['"]@ohos\.router['"]|router\.(pushUrl|replaceUrl|back)/.test(code);
  const usesNavigation = /Navigation\s*\(|NavPathStack/.test(code);
  if (usesRouter && usesNavigation) {
    const line = code.split('\n').findIndex((text) => /router\.|@ohos\.router/.test(text)) + 1;
    out.push(diag('R002', line, 'router 与 Navigation 并存，返回栈行为会不一致'));
  }
  return out;
}

function checkContrastLiterals(code) {
  const out = [];
  const textColors = new Set();
  const backgroundColors = new Set();
  eachLine(code, (text) => {
    const font = /fontColor\(\s*['"](#[0-9a-fA-F]{6,8})['"]\s*\)/.exec(text);
    if (font) textColors.add(font[1]);
    const background = /backgroundColor\(\s*['"](#[0-9a-fA-F]{6,8})['"]\s*\)/.exec(text);
    if (background) backgroundColors.add(background[1]);
  });
  for (const fg of textColors) {
    for (const bg of backgroundColors) {
      const ratio = contrastRatio(fg, bg);
      if (ratio != null && ratio < 3) {
        const line = code.split('\n').findIndex((text) => text.includes(fg)) + 1;
        out.push(diag('R010', line, `文本色 ${fg} 对背景 ${bg} 的对比度 ${ratio.toFixed(2)}:1 < 3:1`));
      }
    }
  }
  return out;
}

function checkNetworkErrorHandling(code) {
  const out = [];
  if (/createHttp\s*\(|http\.request\s*\(/.test(code) && !/catch\s*\(|try\s*\{/.test(code)) {
    const line = code.split('\n').findIndex((text) => /createHttp|http\.request/.test(text)) + 1;
    out.push(diag('R011', line, '网络请求没有 try/catch 或错误分支'));
  }
  return out;
}

function checkPermissionUndeclared(code) {
  const out = [];
  const sensitive = /(getCameraManager|getCurrentLocation|notificationManager|requestPermissionsFromUser)/.test(code);
  const requests = /requestPermissionsFromUser/.test(code);
  if (sensitive && !requests) {
    const line = code.split('\n').findIndex((text) => /(getCameraManager|getCurrentLocation|notificationManager)/.test(text)) + 1;
    out.push(diag('R012', line, '调用了受保护能力但看不到运行时权限申请（module.json5 声明需人工核对）'));
  }
  return out;
}

function checkNestingDepth(code) {
  const out = [];
  let depth = 0;
  let maxDepth = 0;
  let maxLine = 0;
  code.split('\n').forEach((text, index) => {
    for (const char of text) {
      if (char === '{') {
        depth += 1;
        if (depth > maxDepth) {
          maxDepth = depth;
          maxLine = index + 1;
        }
      } else if (char === '}') {
        depth = Math.max(0, depth - 1);
      }
    }
  });
  if (maxDepth > 8) {
    out.push(diag('R014', maxLine, `嵌套深度 ${maxDepth} 层（>8），建议拆子组件`));
  }
  return out;
}

function checkApiVersion(code) {
  const out = [];
  eachLine(code, (text, line) => {
    if (/ModularObjectExtensionAbility|OnDataCallback/.test(text)) {
      out.push(diag('R021', line, '该 API 属于 26.0.0 新增/变更，低版本工程不可用（部分仅 targetSdk≥26 生效）'));
    }
  });
  return out;
}

function checkDarkResource(code) {
  const out = [];
  const hasLiteral = /#[0-9a-fA-F]{3,8}\b/.test(code);
  const usesColorToken = /\$r\(\s*['"]app\.color\./.test(code);
  if (hasLiteral && !usesColorToken) {
    const line = code.split('\n').findIndex((text) => /#[0-9a-fA-F]{3,8}\b/.test(text)) + 1;
    out.push(diag('R008', line, '颜色只写了字面量，没有走双套 color 资源', { severity: 'warn' }));
  }
  return out;
}

function checkReuse(code) {
  const out = [];
  const repeated = (code.match(/\bListItem\s*\(|\bRow\s*\(/g) ?? []).length;
  const hasReuse = /@Builder|@Reusable|ForEach\s*\(|LazyForEach\s*\(/.test(code);
  if (repeated >= 4 && !hasReuse) {
    const line = code.split('\n').findIndex((text) => /\bListItem\s*\(|\bRow\s*\(/.test(text)) + 1;
    out.push(diag('R015', line, `重复 UI 结构 ${repeated} 处，建议抽 @Builder / @Reusable 或列表渲染`, { severity: 'info' }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 动作
// ---------------------------------------------------------------------------

const DETECTORS = [
  checkStateMgmt,
  checkRouterVsNavigation,
  checkMagicValues,
  checkBuildSideEffects,
  checkLazyList,
  checkBreakpoints,
  checkA11y,
  checkContrastLiterals,
  checkNetworkErrorHandling,
  checkPermissionUndeclared,
  checkNestingDepth,
  checkApiVersion,
  checkDarkResource,
  checkReuse,
  checkLifecycle,
];

function summarize(diagnostics) {
  const counts = { error: 0, warn: 0, info: 0 };
  for (const item of diagnostics) counts[item.severity] = (counts[item.severity] ?? 0) + 1;
  const rulesHit = new Set(diagnostics.map((item) => item.ruleId)).size;
  return {
    total: diagnostics.length,
    ...counts,
    rulesHit,
    verdict: counts.error > 0 ? 'blocked' : counts.warn > 0 ? 'pass_with_warnings' : 'pass',
  };
}

function review(code) {
  const diagnostics = DETECTORS.flatMap((detector) => detector(code)).sort((a, b) => a.line - b.line);
  const evaluated = [
    'R001', 'R002', 'R003', 'R004', 'R005', 'R006', 'R007', 'R008', 'R009', 'R010', 'R011',
    'R012', 'R013', 'R014', 'R015', 'R016', 'R017', 'R018', 'R019', 'R021', 'R023', 'R024',
  ];
  const hit = new Set(diagnostics.map((item) => item.ruleId));
  return {
    ok: true,
    data: {
      action: 'review',
      diagnostics,
      summary: summarize(diagnostics),
      coverage: { evaluated: evaluated.length, passed: evaluated.filter((id) => !hit.has(id)).length },
    },
    citations: [],
    warnings: diagnostics.some((item) => item.ruleId === 'R023') ? ['字号不在阶梯内会直接阻断交付'] : [],
  };
}

const V1_TO_V2 = [
  [/@State\b/g, '@Local', '组件内部状态'],
  [/@Prop\b/g, '@Param', '父传子只读参数'],
  [/@Link\b/g, '@Param + @Event', '双向绑定需配合 @Event（需手工改）'],
  [/@Provide\b/g, '@Provider', '跨层注入'],
  [/@Consume\b/g, '@Consumer', '跨层消费'],
  [/@Watch\b/g, '@Monitor', '字段监听（回调签名不同）'],
  [/@Observed\b/g, '@ObservedV2', '类观察'],
  [/@ObjectLink\b/g, '@Trace', '嵌套对象字段观察'],
  [/@Component\b/g, '@ComponentV2', '组件定义（需同步检查子组件）'],
];

function migrateV1toV2(code) {
  const lines = code.split('\n');
  const diff = [];
  const applied = new Map();
  lines.forEach((text, index) => {
    let next = text;
    for (const [pattern, replacement, note] of V1_TO_V2) {
      if (pattern.test(next)) {
        applied.set(replacement, (applied.get(replacement) ?? 0) + 1);
        next = next.replace(pattern, replacement);
        diff.push({ line: index + 1, before: text.trim(), after: next.trim(), note });
      }
    }
  });
  return {
    ok: true,
    data: {
      action: 'migrate',
      kind: 'v1→v2',
      diff,
      summary: { changedLines: diff.length, replacements: Object.fromEntries(applied) },
      manualReview: ['@Link → @Param + @Event 需按双向语义手工补事件', '@Watch 回调参数与 @Monitor 不同', '@Component → @ComponentV2 后子组件也要迁移'],
    },
    citations: [
      {
        title: '状态管理 V1→V2 迁移',
        url: 'https://developer.huawei.com/consumer/cn/doc/harmonyOS-guides/arkts-v1-v2-migration',
        since: null,
        fetched: null,
      },
    ],
    warnings: diff.length === 0 ? ['未发现 V1 装饰器，可能已是 V2 或代码为空'] : [],
  };
}

function a11yReview(code) {
  const diagnostics = checkA11y(code);
  return {
    ok: true,
    data: {
      action: 'a11y',
      diagnostics,
      summary: summarize(diagnostics),
      checklist: ['交互元素有 accessibilityText', '触控热区 ≥40vp', '对比度 ≥3:1', '支持系统大字体'],
    },
    citations: [],
    warnings: diagnostics.length ? ['存在无障碍问题，交付前需修复'] : [],
  };
}

function oneMultiReview(code) {
  const diagnostics = checkBreakpoints(code);
  eachLine(code, (text, line) => {
    if (/columnsTemplate\(\s*['"][^'"]*['"]\s*\)/.test(text) && !/isWide|breakpoint|cols/.test(text)) {
      diagnostics.push(diag('R007', line, 'columnsTemplate 固定列数，未随断点变化'));
    }
    if (/screenWidth|display\.getDefaultDisplay/.test(text)) {
      diagnostics.push(diag('R007', line, '使用屏幕宽度判断断点，应使用窗口宽度'));
    }
  });
  return {
    ok: true,
    data: {
      action: 'one_multi',
      diagnostics,
      summary: summarize(diagnostics),
      checklist: ['按 4/8/12 列切换', '分栏阈值 vp≥600', '折叠屏展开/折叠态', '平板分屏按窗口宽', 'PC 窗口缩放'],
    },
    citations: [],
    warnings: diagnostics.length ? ['存在一多适配问题'] : [],
  };
}

function versionCheck(from, to) {
  const VERSIONS = JSON.parse(readFileSync(join(ROOT, 'content', 'versions.json'), 'utf8'));
  const parse = (text) => {
    const legacy = /^(\d+)\.(\d+)\.(\d+)\((\d+)\)$/.exec(String(text ?? '').trim());
    if (legacy) return { major: Number(legacy[1]), minor: Number(legacy[2]), patch: Number(legacy[3]), api: Number(legacy[4]) };
    const semver = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(text ?? '').trim());
    if (semver) return { major: Number(semver[1]), minor: Number(semver[2]), patch: Number(semver[3]), api: null };
    return null;
  };
  const compare = (a, b) => {
    if (!a || !b) return 0;
    if (a.api != null && b.api != null) return a.api - b.api;
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  };
  const fromV = parse(from);
  const toV = parse(to);
  const diff = VERSIONS.apiDiff.filter((item) => {
    const since = parse(item.since);
    if (!since) return true;
    if (fromV && compare(since, fromV) <= 0) return false;
    if (toV && compare(since, toV) > 0) return false;
    return true;
  });
  return {
    ok: true,
    data: {
      action: 'version',
      range: { from: from ?? null, to: to ?? null },
      current: VERSIONS.current,
      defaultTarget: VERSIONS.defaultTarget,
      apiDiff: diff,
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
    warnings: diff.some((item) => item.affectsTargetSdk) ? ['有条目仅在 targetSdkVersion 提升后生效'] : [],
  };
}

function releaseChecklist() {
  const items = [
    ['签名证书', '发布证书 + Profile 与包名一致', 'manual'],
    ['版本与包名', 'versionCode/versionName 正确、bundleName 未被改动', 'manual'],
    ['权限一致性', 'module.json5 声明与隐私说明逐项对应', 'manual'],
    ['隐私政策', '可访问链接、覆盖收集项', 'manual'],
    ['图标与截图', '分层图标、截图与真机一致', 'manual'],
    ['启动页', '无白屏、品牌一致', 'manual'],
    ['崩溃与性能', '崩溃率达标、首屏耗时可接受', 'manual'],
    ['包体', '资源已压缩、未用资源已清理', 'manual'],
    ['深浅色', '全量页面走查通过', 'manual'],
    ['一多', '手机/折叠/平板/PC 布局验证', 'manual'],
    ['无障碍', '读屏可用、对比度达标', 'manual'],
    ['元数据', '应用描述/分类/关键词完整', 'manual'],
  ];
  return {
    ok: true,
    data: {
      action: 'release',
      checklist: items.map(([item, detail, mode]) => ({ item, detail, mode })),
      summary: { total: items.length, auto: items.filter(([,, mode]) => mode === 'auto').length },
    },
    citations: [],
    warnings: ['上架检查需结合工程与 AGC 实际状态逐项确认'],
  };
}

export function runCheck(action, args = {}, readFile) {
  const code = typeof args.code === 'string' ? args.code : args.path && readFile ? readFile(args.path) : null;
  switch (action) {
    case 'review':
      if (!code) return { ok: false, error: 'review 需要 code 或 path' };
      return review(code);
    case 'migrate':
      if (!code) return { ok: false, error: 'migrate 需要 code 或 path' };
      return migrateV1toV2(code);
    case 'a11y':
      if (!code) return { ok: false, error: 'a11y 需要 code 或 path' };
      return a11yReview(code);
    case 'one_multi':
      if (!code) return { ok: false, error: 'one_multi 需要 code 或 path' };
      return oneMultiReview(code);
    case 'version':
      return versionCheck(args.from, args.to);
    case 'release':
      return releaseChecklist();
    default:
      return { ok: false, error: `未知 action：${action}` };
  }
}

export function ruleCatalog() {
  return RULES.map((rule) => ({ id: rule.id, name: rule.name, layer: rule.layer, severity: rule.severity }));
}

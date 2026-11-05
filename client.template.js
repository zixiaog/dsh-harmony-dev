/**
 * dsh-harmony-dev · Client 半侧（M0）
 *
 * 浏览器端唯一格式要求：window.__ModuleLoader__.load({ id, factory })。
 * React 从宿主模块表 require('react')；样式只用 --dsw-alias-* 主题 token。
 *
 * 面板数据是「构建快照」（由 content/tokens.json + rules.yaml 生成后内联）。
 * M1 改为构建脚本生成，避免手抄漂移。
 */
window.__ModuleLoader__.load({
  id: 'dsh-harmony-dev',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const ID = 'dsh-harmony-dev';
    const TITLE = '鸿蒙开发台';

    // ── 数据快照 ──────────────────────────────────────────────────────────
    const VERSION = { baseline: '6.1.1(24)', maxApi: '26.0.0', fetched: '2026-11-04' };

    const COLORS = [
      ['brand 品牌色', '#ff0a59f7', '#ff317af7'],
      ['font_primary 一级', '#e5000000', '#e5ffffff'],
      ['font_secondary 二级', '#99000000', '#99ffffff'],
      ['font_tertiary 三级', '#66000000', '#66ffffff'],
      ['font_fourth 四级', '#33000000', '#33ffffff'],
      ['comp_divider 分割线', '#33000000', '#33ffffff'],
      ['warning 一级警示', '#ffe84026', '#ffd94838'],
      ['confirm 确认', '#ff64bb5c', '#ff5ba854'],
    ];

    const FONTS = [
      ['Display_L', 'Light', 56, 54, 56],
      ['Display_M', 'Light', 48, 46, 48],
      ['Display_S', 'Light', 38, 36, 38],
      ['Title_L', 'Bold', 30, 28, 30],
      ['Title_M', 'Bold', 24, 22, 24],
      ['Title_S', 'Bold', 20, 18, 20],
      ['Subtitle_L', 'Medium', 18, 16, 18],
      ['Subtitle_M', 'Medium', 16, 14, 16],
      ['Subtitle_S', 'Medium', 14, 12, 14],
      ['Body_L', 'Medium', 16, 14, 16],
      ['Body_M', 'Regular', 14, 14, 14],
      ['Body_S', 'Regular', 12, 14, 12],
      ['Caption_L', 'Medium', 12, 12, 12],
      ['Caption_M', 'Medium', 10, 9, 10],
      ['Caption_S', 'Medium', '—', '—', 8],
    ];

    const SPACE_MARGIN = [
      ['手机', 16, 36, 28],
      ['折叠屏', 24, 36, 28],
      ['平板', 32, 36, 28],
      ['智慧屏', 48, 27, 27],
      ['穿戴', 26, 20, 20],
      ['PC', 40, '—', '—'],
      ['智能座舱', 48, '—', '—'],
    ];

    const SPACE_ELEMENTS = [
      ['卡片之间', 12],
      ['控件间·较大（有明显边界）', 16],
      ['控件间·普通（无明显边界）', 8],
      ['主次文本·上下', 2],
      ['主次文本·左右', 8],
    ];

    const RADIUS = [
      ['标签 / 角标', 4],
      ['图片 / 列表内模块', 8],
      ['卡片 / 内容容器', 16],
      ['按钮 / 菜单 / 选项卡', 20],
      ['半模态 / 顶层浮层', 32],
    ];

    const MOTION = [
      ['简单动画', '100 ms'],
      ['复杂动画', '300 ms'],
      ['小范围 / 局部 / 全屏', '150 / 200 / 350 ms'],
      ['标准曲线', 'cubic-bezier(0.40, 0, 0.20, 1)'],
      ['减速曲线', 'cubic-bezier(0.00, 0, 0.40, 1)'],
      ['交互帧率', '60 FPS'],
    ];

    const BREAKPOINTS = [
      ['0 ≤ vp < 600', 4],
      ['600 ≤ vp < 840', 8],
      ['vp ≥ 840', 12],
    ];

    const RULES = [
      ['R001', 'state-mgmt-mixed', 'L1', 'error', '统一 V1 或 V2，禁止 @Component 与 @ComponentV2 混写'],
      ['R002', 'router-vs-navigation', 'L1', 'warn', '新代码用 Navigation；router 给迁移说明'],
      ['R003', 'magic-value', 'L1', 'error', '颜色/字号/间距/圆角一律走 token'],
      ['R004', 'side-effect-in-build', 'L1', 'warn', 'build 内不做重计算与副作用'],
      ['R005', 'lazy-foreach', 'L1', 'warn', '大列表改 LazyForEach + IDataSource'],
      ['R006', 'lazy-foreach-key', 'L1', 'warn', 'LazyForEach 提供稳定 key'],
      ['R007', 'breakpoint-missing', 'L1', 'warn', '补 mediaquery 断点（600 / 840vp）'],
      ['R008', 'dark-resource-missing', 'L1', 'warn', '颜色资源补齐浅/深两套'],
      ['R009', 'a11y-missing', 'L1', 'warn', '交互组件补 accessibilityText'],
      ['R010', 'contrast', 'L1', 'error', '阅读对比度 ≥ 3:1'],
      ['R011', 'network-no-error-handling', 'L1', 'warn', '网络请求补 catch / 超时 / 重试'],
      ['R012', 'permission-undeclared', 'L1', 'warn', '权限先声明再申请，并做拒绝兜底'],
      ['R013', 'dialog-timing', 'L1', 'warn', 'aboutToAppear 内不要直接弹窗/路由'],
      ['R014', 'deep-nesting', 'L1', 'info', '嵌套 > 8 层就拆组件'],
      ['R015', 'reuse-missing', 'L1', 'info', '重复 UI 抽 @Builder / @Reusable'],
      ['R016', 'image-no-fit', 'L1', 'info', 'Image 设 objectFit 与占位'],
      ['R017', 'motion-params', 'L1', 'info', '时长取 100/150/200/300/350ms，用官方曲线'],
      ['R018', 'leak-listener', 'L1', 'warn', '监听/定时器在 aboutToDisappear 注销'],
      ['R019', 'resource-ref', 'L1', 'info', '资源用 $r 引用，不写相对路径'],
      ['R020', 'atomic-service-capability', 'L1', 'warn', '元服务不得用不支持的能力'],
      ['R021', 'api-not-in-target', 'L1', 'warn', 'API since 不得高于 targetApi'],
      ['R022', 'privacy-mismatch', 'L1', 'warn', '调用的敏感 API 必须被隐私声明覆盖'],
      ['R023', 'typography-scale', 'L1', 'error', '字号只能取 15 级阶梯，字重匹配层级'],
      ['R024', 'token-reference-valid', 'L1', 'error', 'token 名必须存在；level 缺号不可用'],
      ['V01', 'grid-margin', 'L2', 'error', '左右边距 = 设备 margin（手机 16vp）'],
      ['V02', 'grid-column-indent', 'L2', 'warn', '内容缩进对齐栅格列'],
      ['V03', 'spacing-gap', 'L2', 'error', '相邻间距命中 spacing token 且同组一致'],
      ['V04', 'radius-consistent', 'L2', 'error', '同层同类型圆角一致'],
      ['V05', 'radius-hierarchy', 'L2', 'warn', '层级越高圆角越大（4<8<16<20<32）'],
      ['V06', 'touch-target', 'L2', 'warn', '触控区 ≥ 40vp（阈值待校准）'],
      ['V07', 'align-edges', 'L2', 'warn', '同行/同列对齐，±1vp'],
      ['V08', 'contrast', 'L3', 'error', '像素采样对比度 ≥ 3:1'],
      ['V09', 'theme-dual', 'L3', 'error', '深浅色同源 token，背景不可用透明色'],
      ['V10', 'visual-regression', 'L3', 'warn', 'SSIM ≥ 0.98，样式改动需申报'],
    ];

    const CARDS = [
      {
        id: 'comp.list',
        title: 'List 列表',
        summary: '可滚动线性列表容器，支持懒加载、分组与滑动操作。',
        since: 'API 7',
        mgmt: 'V2',
        usage: '长列表、分组列表用 List；瀑布流用 WaterFlow；单屏滚动用 Scroll。',
        example: "List({ space: Space.gapNormal }) {\n  LazyForEach(this.ds, (item) => {\n    ListItem() { Text(item.title) }\n  }, (item) => item.id)\n}",
        pitfalls: ['大量数据必须用 LazyForEach', '嵌套滚动处理手势冲突', 'ListItem 内不要再套 Scroll'],
        tokens: ['space.elements.gapNormal', 'color.comp_divider', 'radius.card'],
      },
      {
        id: 'comp.button',
        title: 'Button 按钮',
        summary: '触发单一操作的交互控件，圆角取 20vp，高度遵循屏幕网格。',
        since: 'API 7',
        mgmt: 'V2',
        usage: '主操作每屏最多一个；次级操作用文字按钮或 Chip。',
        example: "Button('保存')\n  .height(Space.levels[20])\n  .borderRadius(Radius.button)\n  .backgroundColor($r('app.color.brand'))\n  .fontColor($r('app.color.font_on_primary'))",
        pitfalls: ['按钮圆角档位是 20vp，不要随手写 12', '点击区不足 40vp 要扩热区'],
        tokens: ['radius.button', 'color.brand', 'font.Body_M'],
      },
      {
        id: 'comp.toggle',
        title: 'Toggle 开关',
        summary: '二态开关，用于即时生效的设置项；状态变化即时反馈。',
        since: 'API 7',
        mgmt: 'V2',
        usage: '即时生效用 Toggle；需要「保存后生效」用 Checkbox + 保存按钮。',
        example: "Toggle({ type: ToggleType.Switch, isOn: this.isDark })\n  .onChange((isOn) => { this.isDark = isOn })",
        pitfalls: ['不要用 Toggle 承载多选'],
        tokens: ['color.brand', 'radius.button'],
      },
    ];

    const VERSIONS = {
      current: '26.0.0',
      currentSystem: 'HarmonyOS 7.0.0',
      defaultTarget: '6.1.1(24)',
      maxApi: '26.0.0',
      share: '6.1.1(24) 占 84.93% · 7.0.0 占 4.65%（2026-08-29 官方）',
      list: [
        ['5.0.0', 12], ['5.0.1', 13], ['5.0.2', 14], ['5.0.3', 15], ['5.0.4', 16],
        ['5.0.5', 17], ['5.1.0', 18], ['5.1.1', 19], ['6.0.0', 20], ['6.0.1', 21],
        ['6.0.2', 22], ['6.1.0', 23], ['6.1.1', 24], ['26.0.0', '—'],
      ],
      diff: [
        ['26.0.0', 'Agent Framework Kit', 'OnDataCallback.method', '枚举 → string；删除 getClientSessionId()；仅 targetSdkVersion≥26 生效'],
        ['26.0.0', 'AbilityKit', 'ModularObjectExtensionAbility', '新增模块化对象 ExtensionAbility'],
        ['26.0.0', 'ArkWeb', 'Chromium', 'M132 → M144'],
        ['26.0.0', 'ArkUI', 'V2 组件', '新增多个基于状态管理 V2 的组件；增强材质与沉浸光感'],
        ['26.0.0', 'BasicServicesKit', 'DEFAULT_WEB_BROWSER', '默认浏览器权限需三项审核，下个正式版生效'],
        ['6.0.0', 'DataAugmentationKit', '知识 / RAG', '新增知识库、知识检索、知识问答 RAG、图谱构建'],
        ['6.0.0', 'ArkUI', 'HDS 组件', 'HdsSideBar / HdsTabs / HdsSnackBar / HdsActionBar 等'],
      ],
    };

    const BASELINES = [
      { label: '全部', api: null },
      { label: '6.1.1(24)', api: 24 },
      { label: '6.1.0(23)', api: 23 },
      { label: '6.0.0(20)', api: 20 },
    ];

    const EXAMPLES = [
      ['01', '计数器（状态管理 V2）', 'examples/01-counter/CounterPage.ets'],
      ['02', '设置页（List + Toggle）', 'examples/02-settings/SettingsPage.ets'],
      ['03', '列表 + 下拉刷新', 'examples/03-list-refresh/ListPage.ets'],
      ['04', 'Navigation 路由', 'examples/04-navigation/MainPage.ets'],
      ['05', '主题与深浅色', 'examples/05-theme/ThemePage.ets'],
      ['06', '表单校验', 'examples/06-form/FormPage.ets'],
      ['07', '主题切换', 'examples/07-theme-switch/ThemeSwitchPage.ets'],
      ['08', '网络请求 + 重试', 'examples/08-network-retry/NetworkListPage.ets'],
      ['09', '确认弹窗流程', 'examples/09-dialog/DialogPage.ets'],
      ['10', 'Token 化卡片组件', 'examples/10-token-card/TokenCardPage.ets'],
      ['11', '搜索过滤', 'examples/11-search-filter/SearchPage.ets'],
      ['12', '底部页签导航', 'examples/12-bottom-tabs/TabsPage.ets'],
      ['13', '多字段表单校验', 'examples/13-form-deep/FormDeepPage.ets'],
      ['14', '图片列表懒加载', 'examples/14-image-list/ImageListPage.ets'],
      ['15', '点按缩放缓动', 'examples/15-motion/MotionPage.ets'],
      ['16', '深浅色资源', 'examples/16-dark-res/DarkResPage.ets'],
      ['17', '列表-详情分栏', 'examples/17-split/SplitPage.ets'],
      ['18', 'RDB 增查', 'examples/18-rdb/RdbPage.ets'],
      ['19', '网络 + 本地缓存', 'examples/19-cache/CachePage.ets'],
      ['20', '组件库首页', 'examples/20-component-home/HomePage.ets'],
    ];

    // ── 样式工具 ──────────────────────────────────────────────────────────
    const T = {
      text: 'var(--dsw-alias-label-primary, #1a1a1a)',
      text2: 'var(--dsw-alias-label-secondary, #666)',
      text3: 'var(--dsw-alias-label-tertiary, #8c8c8c)',
      bg: 'var(--dsw-alias-bg-base, #ffffff)',
      layer: 'var(--dsw-alias-bg-layer-1, #f5f6f8)',
      border: 'var(--dsw-alias-border-main, #e5e6eb)',
      hover: 'var(--dsw-alias-interactive-bg-hover, #f0f1f3)',
      brand: '#0a59f7',
      danger: '#d94838',
      warn: '#ed6f21',
      info: '#8c8c8c',
    };

    const cssColor = (argb) => {
      if (typeof argb !== 'string' || !argb.startsWith('#') || argb.length !== 9) return argb;
      const a = argb.slice(1, 3);
      const rgb = argb.slice(3);
      return `#${rgb}${a}`;
    };

    const s = {
      root: {
        display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
        background: T.bg, color: T.text,
        fontFamily: 'HarmonyOS Sans, system-ui, -apple-system, sans-serif', fontSize: 13,
      },
      header: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      },
      h1: { fontSize: 14, fontWeight: 600, margin: 0 },
      chip: {
        fontSize: 11, padding: '1px 6px', borderRadius: 4,
        background: T.layer, color: T.text2, border: `1px solid ${T.border}`,
      },
      tabs: { display: 'flex', gap: 4, padding: '8px 12px', flexShrink: 0 },
      tab: {
        border: 'none', background: 'transparent', color: T.text2, cursor: 'pointer',
        fontSize: 12, padding: '5px 10px', borderRadius: 6,
      },
      tabActive: { background: T.layer, color: T.text, fontWeight: 600 },
      body: { flex: 1, minHeight: 0, overflow: 'auto', padding: '4px 14px 18px' },
      sectionTitle: { fontSize: 12, fontWeight: 600, color: T.text2, margin: '14px 0 6px' },
      row: {
        display: 'grid', gridTemplateColumns: 'minmax(120px, 1.2fr) repeat(3, minmax(56px, 0.6fr))',
        gap: 6, alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${T.border}`,
      },
      th: { fontSize: 11, color: T.text3 },
      td: { fontSize: 12 },
      swatch: { width: 22, height: 22, borderRadius: 6, border: `1px solid ${T.border}` },
      rule: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: `1px solid ${T.border}` },
      code: {
        margin: '6px 0 0', padding: 10, borderRadius: 8, background: T.layer,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11.5,
        whiteSpace: 'pre-wrap', lineHeight: 1.55, color: T.text,
      },
      badge: { fontSize: 10, padding: '1px 5px', borderRadius: 4, flexShrink: 0 },
      cardTitle: { fontSize: 13, fontWeight: 600 },
      sub: { fontSize: 12, color: T.text2, marginTop: 2 },
      empty: { fontSize: 12, color: T.text3, padding: '24px 0', textAlign: 'center' },
      tag: { fontSize: 10, padding: '1px 5px', borderRadius: 4, background: T.layer, color: T.text2 },
    };

    const sevTone = (sev) =>
      sev === 'error' ? T.danger : sev === 'warn' ? T.warn : T.info;
    const sevLabel = (sev) => (sev === 'error' ? '阻断' : sev === 'warn' ? '告警' : '提示');

    function SectionRow(props) {
      return h('div', { style: s.row },
        h('span', { style: s.td }, props.label),
        ...props.values.map((value, i) => h('span', { key: i, style: { ...s.td, color: T.text2 } }, value)));
    }

    function TokensView() {
      return h('div', null,
        h('div', { style: s.sectionTitle }, '色彩（浅 / 深）'),
        ...COLORS.map(([name, light, dark]) =>
          h('div', { key: name, style: s.row, gridTemplateColumns: 'minmax(140px,1.4fr) 44px 44px 1fr' },
            h('span', { style: s.td }, name),
            h('span', { style: { ...s.swatch, background: cssColor(light) } }),
            h('span', { style: { ...s.swatch, background: cssColor(dark) } }),
            h('span', { style: { ...s.td, color: T.text3 } }, `${light} / ${dark}`))),

        h('div', { style: s.sectionTitle }, '字号阶梯（手机 / PC / 手表）'),
        h('div', { style: s.row },
          h('span', { style: s.th }, 'Token'),
          h('span', { style: s.th }, '手机'),
          h('span', { style: s.th }, 'PC'),
          h('span', { style: s.th }, '手表')),
        ...FONTS.map(([name, weight, phone, pc, watch]) =>
          h('div', { key: name, style: s.row },
            h('span', { style: s.td }, name, h('span', { style: { ...s.sub, marginLeft: 6 } }, weight)),
            h('span', { style: { ...s.td, color: T.text2 } }, String(phone)),
            h('span', { style: { ...s.td, color: T.text2 } }, String(pc)),
            h('span', { style: { ...s.td, color: T.text2 } }, String(watch)))),

        h('div', { style: s.sectionTitle }, '屏幕边缘边距（左右 / 上 / 下，vp）'),
        ...SPACE_MARGIN.map(([device, left, top, bottom]) =>
          h(SectionRow, { key: device, label: device, values: [left, top, bottom] })),

        h('div', { style: s.sectionTitle }, '元素间距'),
        ...SPACE_ELEMENTS.map(([label, value]) =>
          h(SectionRow, { key: label, label, values: [`${value} vp`] })),

        h('div', { style: s.sectionTitle }, '圆角档位'),
        ...RADIUS.map(([label, value]) =>
          h(SectionRow, { key: label, label, values: [`${value} vp`] })),

        h('div', { style: s.sectionTitle }, '动效'),
        ...MOTION.map(([label, value]) =>
          h(SectionRow, { key: label, label, values: [value] })),

        h('div', { style: s.sectionTitle }, '窗口断点 / 栅格列数'),
        ...BREAKPOINTS.map(([range, columns]) =>
          h(SectionRow, { key: range, label: range, values: [`${columns} 列`] })),

        h('div', { style: { ...s.sub, marginTop: 14, color: T.text3 } },
          `快照：${VERSION.fetched} · 基线 ${VERSION.baseline} · 能力上限 ${VERSION.maxApi} · TBD：行高/背景色系/阴影材质/断点完整分档`),
      );
    }

    function RulesView(props) {
      const query = props.query.trim().toLowerCase();
      const list = RULES.filter(([id, name, layer, sev, fix]) =>
        !query || `${id} ${name} ${sev} ${fix}`.toLowerCase().includes(query));
      if (list.length === 0) return h('div', { style: s.empty }, '没有匹配项');
      return h('div', null,
        ...list.map(([id, name, layer, sev, fix]) =>
          h('div', { key: id, style: s.rule },
            h('span', { style: { ...s.badge, color: sevTone(sev), background: T.layer } }, sevLabel(sev)),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', null,
                h('span', { style: { fontWeight: 600, marginRight: 6 } }, id),
                h('span', { style: { color: T.text3, fontSize: 11 } }, `${layer} · ${name}`)),
              h('div', { style: { ...s.td, color: T.text2, marginTop: 2 } }, fix)))));
    }

    function sinceApiOf(since) {
      const match = /API\s*(\d+)/i.exec(String(since ?? ''));
      return match ? Number(match[1]) : null;
    }

    function CopyButton(props) {
      const [copied, setCopied] = React.useState(false);
      return h('button', {
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(props.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            /* 剪贴板不可用时静默 */
          }
        },
        style: {
          marginTop: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px', borderRadius: 6,
          border: `1px solid ${T.border}`, background: copied ? T.brand : T.layer,
          color: copied ? '#ffffff' : T.text2,
        },
      }, copied ? '已复制' : '复制代码');
    }

    function TopicItem(props) {
      const [open, setOpen] = React.useState(false);
      const topic = props.topic;
      return h('div', { style: { marginTop: 4, paddingLeft: 8, borderLeft: `2px solid ${T.border}` } },
        h('button', {
          onClick: () => setOpen(!open),
          style: {
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0',
            fontFamily: 'inherit', fontSize: 12, color: T.text, fontWeight: 600, textAlign: 'left',
          },
        }, `${open ? '▼' : '▶'} ${topic.title}`),
        open
          ? h('div', null,
              h('div', { style: { ...s.td, color: T.text2, marginTop: 4, whiteSpace: 'pre-wrap' } }, topic.content),
              topic.code ? h('pre', { style: s.code }, topic.code) : null,
              topic.source
                ? h('a', {
                    href: topic.source,
                    target: '_blank',
                    rel: 'noreferrer',
                    style: { display: 'inline-block', marginTop: 4, fontSize: 11, color: T.brand },
                  }, '官方原文')
                : null)
          : null);
    }

    function CardsView(props) {
      const [activeCat, setActiveCat] = React.useState('全部');
      const [collapsed, setCollapsed] = React.useState({});
      const query = props.query.trim().toLowerCase();
      const excluded = [];

      const counts = {};
      for (const card of CARDS) {
        if (card.cat) counts[card.cat] = (counts[card.cat] ?? 0) + 1;
      }
      const categories = ['全部', ...Object.keys(counts)];

      const total = CARDS.filter((card) => {
        if (activeCat !== '全部' && card.cat !== activeCat) return false;
        if (query && !`${card.id} ${card.title} ${card.summary} ${card.usage}`.toLowerCase().includes(query)) {
          return false;
        }
        const api = sinceApiOf(card.since);
        if (props.baseline != null && api != null && api > props.baseline) {
          excluded.push(card.id);
          return false;
        }
        return true;
      });

      const groups = new Map();
      for (const card of total) {
        const key = card.group || '其他';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(card);
      }

    const renderCard = (card) =>
        h('div', { key: card.id, style: { padding: '10px 0', borderBottom: `1px solid ${T.border}` } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('span', { style: s.cardTitle }, card.title),
            h('span', { style: s.tag }, card.sub || card.cat || '—'),
            h('span', { style: s.tag }, card.since),
            h('span', { style: s.tag }, `state_mgmt: ${card.mgmt}`)),
          h('div', { style: s.sub }, card.summary),
          h('div', { style: { ...s.td, color: T.text2, marginTop: 6 } }, card.usage),
          h('pre', { style: s.code }, card.example),
          h(CopyButton, { text: card.example }),
          h('div', { style: { marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 } },
            ...card.tokens.map((token) => h('span', { key: token, style: s.tag }, token))),
          (card.topics ?? []).length > 0
            ? h('div', { style: { marginTop: 6 } },
                h('div', { style: { ...s.sectionTitle, fontSize: 12 } },
                  `主题（${card.topics.length}${
                    card.topicsSource === 'auto' ? ' · 自动整理'
                      : card.topicsSource === 'official-toc' ? ' · 官方目录'
                        : ''
                  }）`),
                ...card.topics.map((topic) => h(TopicItem, { key: topic.id, topic })))
            : null,
          h('ul', { style: { margin: '6px 0 0', paddingLeft: 18, color: T.text2, fontSize: 12 } },
            ...card.pitfalls.map((pitfall) => h('li', { key: pitfall }, pitfall))));

      const groupBlocks = [...groups.entries()].map(([group, items]) => {
        const isCollapsed = Boolean(collapsed[group]);
        return h('div', { key: group },
          h('button', {
            onClick: () => setCollapsed((prev) => ({ ...prev, [group]: !prev[group] })),
            style: {
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '10px 0 4px', fontFamily: 'inherit', textAlign: 'left',
              color: T.text2, fontSize: 12, fontWeight: 600,
            },
          },
            h('span', { style: { color: T.text3 } }, isCollapsed ? '▶' : '▼'),
            h('span', null, `${group}（${items.length}）`)),
          isCollapsed ? null : items.map(renderCard));
      });

      return h('div', { style: { display: 'flex', gap: 16, alignItems: 'flex-start' } },
        h('div', { style: { width: 190, flexShrink: 0, position: 'sticky', top: 0 } },
          h('div', { style: s.sectionTitle }, `目录分类（${CARDS.length}）`),
          ...categories.map((cat) =>
            h('button', {
              key: cat,
              onClick: () => setActiveCat(cat),
              style: {
                display: 'flex', justifyContent: 'space-between', width: '100%',
                padding: '5px 8px', marginBottom: 2, borderRadius: 6, cursor: 'pointer',
                border: 'none', textAlign: 'left', fontFamily: 'inherit', fontSize: 12,
                background: activeCat === cat ? T.layer : 'transparent',
                color: activeCat === cat ? T.text : T.text2,
                fontWeight: activeCat === cat ? 600 : 400,
              },
            }, h('span', null, cat), h('span', { style: { color: T.text3 } }, String(cat === '全部' ? CARDS.length : counts[cat] ?? 0))))),
        h('div', { style: { flex: 1, minWidth: 0 } },
          excluded.length > 0
            ? h('div', { style: { ...s.sub, color: T.warn, marginBottom: 6 } }, `按基线过滤掉 ${excluded.length} 张卡片`)
            : null,
          h('div', { style: { ...s.sub, marginBottom: 6 } }, `当前：${activeCat} · ${total.length} 条 · ${groups.size} 个分组`),
          total.length === 0
            ? h('div', { style: s.empty }, '没有匹配项')
            : groupBlocks));
    }

    function ExamplesView(props) {
      const query = props.query.trim().toLowerCase();
      const list = EXAMPLES.filter(([, title, file]) =>
        !query || `${title} ${file}`.toLowerCase().includes(query));
      if (list.length === 0) return h('div', { style: s.empty }, '没有匹配项');
      return h('div', null,
        h('div', { style: { ...s.sub, marginBottom: 8 } },
          '20 个可读示例，代码在 examples/ 下；对话里也可用 harmony_search 检索。'),
        ...list.map(([no, title, file]) =>
          h('div', { key: no, style: s.rule },
            h('span', { style: { ...s.badge, color: T.text3, background: T.layer } }, no),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600 } }, title),
              h('div', {
                style: {
                  ...s.td, color: T.text3, marginTop: 2, fontSize: 11,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                },
              }, file)))));
    }

    function VersionView() {
      return h('div', null,
        h('div', { style: s.sectionTitle }, '版本口径'),
        h('div', { style: { ...s.td, color: T.text2, lineHeight: 1.6 } },
          `当前最新 ${VERSIONS.current}（${VERSIONS.currentSystem}）· 默认写作基线 ${VERSIONS.defaultTarget} · 能力上限 ${VERSIONS.maxApi}`),
        h('div', { style: { ...s.sub, marginTop: 4 } }, VERSIONS.share),
        h('div', { style: s.sectionTitle }, '版本 / API 对照'),
        ...VERSIONS.list.map(([system, api]) =>
          h('div', { key: system, style: s.row },
            h('span', { style: s.td }, system),
            h('span', { style: { ...s.td, color: T.text2 } }, api === '—' ? 'SemVer（无 API 号）' : `API ${api}`))),
        h('div', { style: s.sectionTitle }, 'API 变更（apidiff 摘要）'),
        ...VERSIONS.diff.map(([since, kit, symbol, detail], index) =>
          h('div', { key: `${since}-${symbol}-${index}`, style: s.rule },
            h('span', { style: { ...s.badge, color: T.text3, background: T.layer } }, since),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', null,
                h('span', { style: { fontWeight: 600, marginRight: 6 } }, symbol),
                h('span', { style: { color: T.text3, fontSize: 11 } }, kit)),
              h('div', { style: { ...s.td, color: T.text2, marginTop: 2 } }, detail)))),
        h('div', { style: { ...s.sub, marginTop: 14, color: T.text3 } },
          '逐 Kit 的 apidiff 页尚未逐页抽取，当前为官方发布说明摘要；M1 补全后替换。'),
      );
    }

    function Panel() {
      const [tab, setTab] = React.useState('tokens');
      const [query, setQuery] = React.useState('');
      const [baseline, setBaseline] = React.useState(24);
      const baselineInfo = BASELINES.find((item) => item.api === baseline) ?? BASELINES[1];
      const tabs = [
        ['tokens', '设计 token'],
        ['rules', `规则 ${RULES.length}`],
        ['cards', '内容库'],
        ['examples', `示例 ${EXAMPLES.length}`],
        ['version', '版本'],
      ];
      return h('div', { style: s.root },
        h('div', { style: s.header },
          h('h1', { style: s.h1 }, TITLE),
          h('button', {
            onClick: () => {
              const index = BASELINES.findIndex((item) => item.api === baseline);
              setBaseline(BASELINES[(index + 1) % BASELINES.length].api);
            },
            title: '点击切换基线（卡片按 since 过滤）',
            style: {
              ...s.chip, cursor: 'pointer', border: `1px solid ${T.border}`,
              background: T.layer, color: T.text, fontFamily: 'inherit',
            },
          }, `基线 ${baselineInfo.label}`),
          h('span', { style: s.chip }, `上限 ${VERSION.maxApi}`),
          h('span', { style: { flex: 1 } }),
          h('input', {
            value: query,
            onChange: (event) => setQuery(event.target.value),
            placeholder: '搜 token / 规则 / 内容',
            style: {
              width: 200, padding: '5px 8px', fontSize: 12, borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.layer, color: T.text, outline: 'none',
            },
          })),
        h('div', { style: s.tabs },
          ...tabs.map(([key, label]) =>
            h('button', {
              key,
              onClick: () => setTab(key),
              style: { ...s.tab, ...(tab === key ? s.tabActive : null) },
            }, label))),
        h('div', { style: s.body },
          tab === 'tokens' ? h(TokensView) : null,
          tab === 'rules' ? h(RulesView, { query }) : null,
          tab === 'cards' ? h(CardsView, { query, baseline }) : null,
          tab === 'examples' ? h(ExamplesView, { query }) : null,
          tab === 'version' ? h(VersionView) : null));
    }

    // 侧栏图标：与「插件/自动化任务/乔木 UI 学习」一致的线性描边风格（不填充、currentColor）
    const Icon = () =>
      h('svg', {
        width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('rect', { x: 3.2, y: 4.2, width: 17.6, height: 15.6, rx: 3.4 }),
        h('path', { d: 'M9.4 9.6 7.2 12l2.2 2.4' }),
        h('path', { d: 'M14.6 9.6 16.8 12l-2.2 2.4' }),
        h('path', { d: 'M13.2 9.2l-2.4 5.6' }));

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() =>
          ctx.slots.inject('main', () =>
            ctx.slots.register({ name: 'main', key: ID, locale: ID }, Panel)));

        ctx.effect(() =>
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              { name: 'sidebar.panellist', id: ID, order: 40, locale: ID, label: () => TITLE },
              Icon)));
      },
    };
  },
});

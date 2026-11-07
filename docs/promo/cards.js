/* dsh-harmony-dev promo cards — 6 张竖版 9:16 推广图（1080×1920）
 * 用法：index.html?n=1..6 ，Edge 无头截图渲染。
 */
(function () {
  var LOGO =
    '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" aria-hidden="true">' +
    '<g stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="3.4"/>' +
    '<path d="M9.4 9.6 7.2 12l2.2 2.4"/>' +
    '<path d="M14.6 9.6 16.8 12l-2.2 2.4"/>' +
    '<path d="M13.2 9.2l-2.4 5.6"/>' +
    '</g></svg>';

  var CARDS = {
    1: {
      title: '鸿蒙开发台',
      body:
        '<div class="cover">' +
        '<div class="kicker">DeepSeek Harness · Plugin</div>' +
        '<h1 class="big">鸿蒙<span class="grad">开发台</span></h1>' +
        '<div class="mono grad-text cover-name">dsh-harmony-dev</div>' +
        '<p class="sub">检索 · 生成 · 校验，一体化鸿蒙原生开发助手</p>' +
        '<div class="chips">' +
        '<span class="chip">harmony_search</span>' +
        '<span class="chip">harmony_get</span>' +
        '<span class="chip">harmony_build</span>' +
        '<span class="chip">harmony_check</span>' +
        '<span class="chip">harmony_create</span>' +
        '</div>' +
        '<div class="panel stats">' +
        '<div class="stat"><b>366</b><span>条内容条目</span></div>' +
        '<div class="stat"><b>34</b><span>条规范规则</span></div>' +
        '<div class="stat"><b>14</b><span>个版本对照</span></div>' +
        '<div class="stat"><b>1211</b><span>个可下钻主题</span></div>' +
        '</div>' +
        '<div class="panel cta">' +
        '<div class="cta-label">安装</div>' +
        '<div class="cmd mono">dsh plugin add<br/>https://github.com/zixiaog/dsh-harmony-dev</div>' +
        '<div class="cta-note">npm 包 · v0.1.1 · 首次安装约 15 秒 · 不需要 Python</div>' +
        '</div>' +
        '<div class="cover-foot">DeepSeek Harness Desktop · 开源 MIT · 内容离线可用</div>' +
        '</div>',
    },
    2: {
      title: '五个工具，一条流水线',
      body:
        '<div class="kicker">Tools</div>' +
        '<h1 class="small">五个工具，一条流水线</h1>' +
        '<p class="sub" style="margin-top:18px">从「查规范」到「出工程」，模型一次调用直达</p>' +
        '<div class="tool-list">' +
        '<div class="tool"><div class="idx">01</div><div>' +
        '<div class="tool-head"><span class="tool-name mono">harmony_search</span><span class="tool-zh">知识检索</span></div>' +
        '<div class="tool-desc">组件卡 / 规范 / token / 官方 MCP 联合检索，按目标基线过滤</div></div></div>' +
        '<div class="tool"><div class="idx">02</div><div>' +
        '<div class="tool-head"><span class="tool-name mono">harmony_get</span><span class="tool-zh">按引用取全文</span></div>' +
        '<div class="tool-desc">ref 直达卡片、规则、token、版本差异，不用翻文档</div></div></div>' +
        '<div class="tool"><div class="idx">03</div><div>' +
        '<div class="tool-head"><span class="tool-name mono">harmony_build</span><span class="tool-zh">代码生成</span></div>' +
        '<div class="tool-desc">Tokens.ets / Stage 骨架 / 页面模板，附魔法值与无障碍自查</div></div></div>' +
        '<div class="tool"><div class="idx">04</div><div>' +
        '<div class="tool-head"><span class="tool-name mono">harmony_check</span><span class="tool-zh">规则校验</span></div>' +
        '<div class="tool-desc">review / migrate / a11y / 一多 / version / release 六类体检</div></div></div>' +
        '<div class="tool"><div class="idx">05</div><div>' +
        '<div class="tool-head"><span class="tool-name mono">harmony_create</span><span class="tool-zh">工程脚手架</span></div>' +
        '<div class="tool-desc">一键生成可被 DevEco Studio 打开的 Stage 工程</div></div></div>' +
        '</div>' +
        '<div class="panel note-panel" style="margin-top:26px">五个工具共用同一份内容库与规则集：检索到的规范，生成时直接执行校验，校验问题逐条给官方出处。</div>' +
        '<div class="chips" style="margin-top:24px;justify-content:center;gap:12px">' +
        '<span class="chip sm">离线可用</span><span class="chip sm">官方出处</span>' +
        '<span class="chip sm">金标 100%</span><span class="chip sm">覆盖一多与无障碍</span>' +
        '</div>',
    },
    3: {
      title: '366 条内容，拿来就用',
      body:
        '<div class="kicker">Content</div>' +
        '<h1 class="small">366 条内容，拿来就用</h1>' +
        '<p class="sub" style="margin-top:16px">组件卡 / 规范 / API / 课程 / 示例，全部带官方出处</p>' +
        '<div class="stat-grid">' +
        '<div class="panel stat-card"><b>366</b><span>条内容条目</span></div>' +
        '<div class="panel stat-card"><b>34</b><span>条规则（22 条可执行）</span></div>' +
        '<div class="panel stat-card"><b>14</b><span>个版本对照</span></div>' +
        '<div class="panel stat-card"><b>1211</b><span>个可下钻主题</span></div>' +
        '</div>' +
        '<div class="panel comp">' +
        '<div class="comp-title">内容构成</div>' +
        '<div class="comp-bar">' +
        '<i style="width:10.9%;background:#3b82f6"></i>' +
        '<i style="width:16.4%;background:#22d3ee"></i>' +
        '<i style="width:54.6%;background:#8b5cf6"></i>' +
        '<i style="width:12.6%;background:#f59e0b"></i>' +
        '<i style="width:5.5%;background:#4ade80"></i>' +
        '</div>' +
        '<div class="comp-legend">' +
        '<span><i style="background:#3b82f6"></i>组件卡 40</span>' +
        '<span><i style="background:#22d3ee"></i>设计规范 60</span>' +
        '<span><i style="background:#8b5cf6"></i>API 卡 200</span>' +
        '<span><i style="background:#f59e0b"></i>课程 46</span>' +
        '<span><i style="background:#4ade80"></i>示例 20</span>' +
        '</div></div>' +
        '<div class="panel gold">金标回归 <b>52 题</b> · 命中 <b>100%</b> · 引用 <b>100%</b></div>' +
        '<div class="panel note-panel" style="margin-top:26px;padding:26px 32px">' +
        '<div class="comp-title" style="margin-bottom:16px">覆盖范围</div>' +
        '<div class="chips" style="gap:12px">' +
        '<span class="chip sm">组件</span><span class="chip sm">布局</span><span class="chip sm">动效</span>' +
        '<span class="chip sm">无障碍</span><span class="chip sm">一多</span><span class="chip sm">上架清单</span>' +
        '<span class="chip sm">版本迁移</span><span class="chip sm">主题与字体</span><span class="chip sm">状态管理 V2</span>' +
        '</div></div>',
    },
    4: {
      title: '版本能力：跨版本直接比',
      body:
        '<div class="kicker">Versions</div>' +
        '<h1 class="small">版本能力：跨版本直接比</h1>' +
        '<p class="sub" style="margin-top:16px">旧格式与 SemVer 一起比：6.1.1(24) ↔ 26.0.0</p>' +
        '<div class="two">' +
        '<div class="panel code-card"><div class="cap">旧格式（API ≤ 24）</div><div class="val">6.1.1(24)</div><div class="hint">括号内为 API level</div></div>' +
        '<div class="panel code-card"><div class="cap">SemVer（HarmonyOS 7）</div><div class="val">26.0.0</div><div class="hint">不再带 API level 后缀</div></div>' +
        '</div>' +
        '<div class="panel diff">' +
        '<div class="call">harmony_get { ref: "24→26" }</div>' +
        '<div class="arrow">↓</div>' +
        '<div class="res">返回 <b>9 条 apidiff</b>：新增 / 变更 / 删除，区分 Kit 与符号，标注是否影响目标 SDK</div>' +
        '</div>' +
        '<div class="panel baseline">按 <code>targetApi: "6.1.1(24)"</code> 检索会<b>排除 since 更高的卡片</b>，并明确告警「该内容属于更高版本」。双基线：默认 <b>6.1.1(24)</b>，上限 <b>26.0.0</b>。</div>' +
        '<div class="panel diff" style="margin-top:24px">' +
        '<div class="call">harmony_check { action: "version",<br/>from: "6.1.1(24)", to: "26.0.0" }</div>' +
        '<div class="res" style="margin-top:12px">按 apidiff 列出该区间的 API 变更与受影响写法，升级前先知道要改什么</div>' +
        '</div>' +
        '<div class="panel note-panel" style="margin-top:24px">覆盖 <b>5.0.0 → 26.0.0</b> 共 <b>14</b> 个版本对照；26.0.0 起为 SemVer 新起点（= HarmonyOS 7.0.0）。</div>',
    },
    5: {
      title: '安装：三种方式，一分钟',
      body:
        '<div class="kicker">Install</div>' +
        '<h1 class="small">安装：三种方式，一分钟</h1>' +
        '<p class="sub" style="margin-top:16px">用仓库已提交的构建产物，不跑构建脚本、不需要 Python</p>' +
        '<div class="method-list">' +
        '<div class="method"><div class="n">1</div><div>' +
        '<div class="m-title">命令行安装</div>' +
        '<div class="m-body">dsh plugin add<br/>https://github.com/zixiaog/dsh-harmony-dev</div></div></div>' +
        '<div class="method"><div class="n">2</div><div>' +
        '<div class="m-title">插件页安装</div>' +
        '<div class="m-body">「添加插件」填 dsh-harmony-dev</div>' +
        '<div class="m-note">npm 包，实测通过 · 首次安装约 15 秒</div></div></div>' +
        '<div class="method"><div class="n">3</div><div>' +
        '<div class="m-title">本地目录安装</div>' +
        '<div class="m-body">plugin_manager install_bundle → 绝对目录</div></div></div>' +
        '</div>' +
        '<div class="panel verify">' +
        '<div class="v-title">安装后验证</div>' +
        '<ul style="margin:0;padding:0">' +
        '<li>工具表出现 harmony_search / get / build / check / create</li>' +
        '<li>「用 harmony_search 查一下列表懒加载」命中 comp.list 并带官方出处</li>' +
        '</ul></div>' +
        '<div class="panel note-panel" style="margin-top:22px">本地内容离线可用；官方知识库（MCP）需联网，断网自动降级。</div>' +
        '<div class="panel note-panel" style="margin-top:20px">npm 包：<b>dsh-harmony-dev@0.1.1</b> · GitHub：<b>zixiaog/dsh-harmony-dev</b></div>',
    },
    6: {
      title: '谁适合用它',
      body:
        '<div class="kicker">Scenarios</div>' +
        '<h1>谁适合用它</h1>' +
        '<p class="sub" style="margin-top:16px">从新项目起步到存量代码体检，覆盖鸿蒙开发全流程</p>' +
        '<div class="scene-grid">' +
        '<div class="panel scene"><span class="tag">新项目</span><h3>起步就有规范</h3><p>harmony_create 出 Stage 工程，harmony_build 直接给 Tokens 与页面模板</p></div>' +
        '<div class="panel scene"><span class="tag">Review</span><h3>存量代码体检</h3><p>22 条可执行规则：review / a11y / 一多 / 上架清单，逐条给行号与修法</p></div>' +
        '<div class="panel scene"><span class="tag">升级</span><h3>版本迁移不踩坑</h3><p>24→26 apidiff 先看差异，migrate 再把 V1 写法换成 V2</p></div>' +
        '<div class="panel scene"><span class="tag">团队</span><h3>口径统一</h3><p>46 讲课程 + 200 张 API 卡，新人查同一条规范，引用同一份出处</p></div>' +
        '</div>' +
        '<div class="panel finale"><b>dsh-harmony-dev</b> · 鸿蒙原生开发台<br/><span class="mono" style="font-size:24px">github.com/zixiaog/dsh-harmony-dev</span></div>' +
        '<div class="panel cta" style="margin-top:22px;padding:30px 38px">' +
        '<div class="cta-label">马上安装</div>' +
        '<div class="cmd mono" style="font-size:28px">dsh plugin add<br/>https://github.com/zixiaog/dsh-harmony-dev</div>' +
        '</div>' +
        '<div class="meta-note" style="margin-top:24px">MIT 许可 · 开源可改 · 内容可增量维护（随仓库提交，无需构建）</div>',
    },
  };

  var params = new URLSearchParams(location.search);
  var n = Number(params.get('n') || 1);
  var card = CARDS[n] || CARDS[1];

  var header =
    '<header class="top">' +
    '<div class="brand"><div class="logo-tile">' + LOGO + '</div>' +
    '<div><div class="wordmark">dsh-harmony-dev</div><div class="brandsub">鸿蒙开发台</div></div></div>' +
    '<div class="badge">DeepSeek Harness · 插件</div></header>';

  var footer =
    '<footer class="foot"><div>github.com/zixiaog/dsh-harmony-dev</div>' +
    '<div class="pager">0' + n + ' / 06</div></footer>';

  document.querySelector('.page').innerHTML =
    '<div class="grid"></div><div class="glow g1"></div><div class="glow g2"></div>' +
    '<div class="glow g3"></div><div class="vignette"></div>' +
    header + '<main>' + card.body + '</main>' + footer;

  document.title = 'dsh-harmony-dev · 鸿蒙开发台 · 0' + n;
})();

# dsh-harmony-dev（鸿蒙开发台）· 全量版

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![DSH plugin](https://img.shields.io/badge/DeepSeek%20Harness-plugin-0A59F7)](https://github.com/zixiaog/dsh-harmony-dev)

装进 DeepSeek Harness 的鸿蒙原生开发知识插件：**366 条内容 / 5 个工具 / 22 条可执行规则 / 官方知识库通道 / 全量内容面板**。

> 仓库：<https://github.com/zixiaog/dsh-harmony-dev> · 文档：[使用手册](docs/使用手册.md) / [内容贡献指南](docs/内容贡献指南.md) / [架构与接入](docs/架构与接入.md)

## M2 范围

| 能力 | 状态 |
|---|---|
| Host 工具 `harmony_search` / `harmony_get` / `harmony_build` / `harmony_check` / `harmony_create` | ✅ 5 个工具 |
| `harmony_create`：直接落盘生成可打开的 Stage 工程骨架（20 个文件，empty/tabs/list/settings） | ✅ 实测生成后 `harmony_check` 判定 pass |
| 校验：review（静态规则）/ migrate（V1→V2）/ a11y / one_multi / version / release | ✅ 22 条规则可执行（34 条中） |
| 华为官方知识库 MCP（内置最小 JSON-RPC 客户端） | ✅ 实测返回官方文档片段与全文；坏端点自动降级 |
| 版本能力：14 个版本 / 9 条 apidiff / 版本归一化 + 基线过滤 | ✅ |
| 代码生成：tokens / scaffold / page，自带自查 | ✅ M2 新增 |
| Client 面板（sidebar 入口 + main 整页，五 Tab：token / 规则 / 内容库 / 示例 / 版本） | ✅ 基线切换 + 复制代码 + 官方目录分类 |
| 数据：**40 组件卡 + 60 设计规范 + 200 API 卡 + 46 讲课程 + 20 个示例**（共 366 条）+ 34 条规则 + 版本表 | ✅ 内容全部达标 |
| 官方出处：**281/366 张卡片有 sources**（API 卡 167/200 由官方索引自动匹配） | ✅ 金标引用率 100% |
| 面板数据 | ✅ 全量内嵌（346 卡 + 34 规则 + 20 示例），三级目录（一级目录 → 二级分组 → Kit/组件类别），分组可折叠；**366 张卡全部有主题（1211 个）**：4 张精编 + 33 个 Kit 官方目录（190 主题，其中 135 条正文自动抽取自官方页、19 条本地补写、0 占位）+ 其余自动整理 |
| 规则回归：8 条规则 × 正反例 16 例 | ✅ 全过 |
| 评审工具（`harmony_check`） | ✅ 已完成（M3） |

## 目录

```
harmony-dev-kit/
├─ package.json          # dsh.bundle.patch + dsh.client
├─ cordis.patch.yml      # 插入插件行（M2 再加 MCP 行）
├─ index.js              # Host：函数式 apply + inject['tools']，5 个工具
├─ lib/mcp.js            # 官方知识库 MCP 客户端（initialize → tools/call，超时+熔断）
├─ lib/check.js          # 静态检查：22 条规则检测器 + 迁移 + 无障碍/一多/版本/上架清单
├─ lib/create.js         # 工程生成器（Stage 骨架 20 文件，4 种模板）
├─ client.template.js    # 面板模板（数据由 build-client 注入）
├─ client.js             # Client：__ModuleLoader__ + main / sidebar.panellist（全量数据）
├─ content/sources/api-sources.json  # API 卡官方出处 overlay（llms 索引匹配）
├─ locale/{zh,en}.json   # 插件管理页显示用
├─ icon.svg
├─ content/tokens.json   # token 源（唯一真源快照）
├─ content/versions.json # 版本表 + apidiff 条目 + 基线口径
├─ content/cards/cards.yaml       # 首批 3 张组件卡
├─ content/cards/components.yaml  # 批次 2：9 张组件卡
├─ content/cards/components2.yaml # 批次 3：14 张（选择/输入/反馈类）
├─ content/cards/components3.yaml # 批次 4：14 张（容器/布局/媒体类）→ 共 40 张
├─ content/cards/api1.yaml        # API 卡 20 条（网络/数据/权限/事件/Ability）
├─ content/cards/api2.yaml        # API 卡 20 条（资源/工具/动画/文件/媒体/能力）
├─ content/cards/api3.yaml        # API 紧凑条目 63 条（缺 sections 由构建自动展开）
├─ content/cards/api4.yaml        # API 紧凑条目 62 条（并发/媒体/网络/文件/设备/ArkUI 运行时）
├─ content/cards/api5.yaml        # Kit 概览卡 40 条（@kit.* 套件级）→ API 共 200 条
├─ content/cards/lessons.yaml     # 入门课程 10 讲
├─ content/cards/lessons2.yaml    # 进阶课程 18 讲（自定义组件/动效/一多/模块化/性能/无障碍/分布式/上架…）
├─ content/cards/lessons3.yaml    # 高阶+实战 18 讲（Canvas/媒体/ArkWeb/分布式/性能/走查/实战项目）→ 共 46 讲
├─ content/cards/examples.yaml    # 配套示例索引 5 条
├─ content/cards/examples2.yaml   # 示例索引 6~10 条
├─ content/cards/examples3.yaml   # 示例索引 11~20 条 → 共 20 个
├─ examples/                      # 20 个可读示例（搜索/页签/表单/RDB/缓存/分栏/动效/主题…）
├─ content/cards/design.yaml      # 设计规范条目 22 条（色彩/字体/间距/圆角/动效/布局）
├─ content/cards/design2.yaml     # 设计规范 38 条（响应式 8 法/多端/图标/无障碍/UX 标准）→ 共 60
├─ data/{tokens,versions,cards,rules}.json  # 构建产物（build_data.py 生成）
├─ docs/                    # 使用手册 / 内容贡献指南 / 架构与接入
├─ golden/golden-set.json   # 金标集（50 题检索 + 2 题版本）
└─ scripts/
   ├─ build_data.py       # 源 → data/*.json + manifest
   ├─ build-client.mjs    # data → client.js（面板全量数据）
   ├─ enrich_api_sources.mjs # 官方 llms 索引 → API 卡 sources overlay
   ├─ verify-client-data.mjs # 校验面板内嵌数据规模
   ├─ check_rules.py      # 规则回归（16 例）
   ├─ run_golden.mjs      # 金标回归（命中率/引用率，阈值 85%）
   ├─ e2e.mjs             # 端到端 7 步
   ├─ check_package.mjs   # 打包前检查
   └─ test_m0.mjs         # 不装宿主自测（4 工具）
```

## 自测与质量门

```bash
python scripts/build_data.py       # 内容校验 + 合并
node scripts/build-client.mjs      # 面板数据注入（346 卡 / 34 规则 / 20 示例）
node scripts/verify-client-data.mjs# 校验面板内嵌规模
node scripts/test_m0.mjs           # 4 工具注册/执行 + 22 检测器 → 无损 JSON
python scripts/check_rules.py      # 8 条规则 × 正反例 = 16 例
node scripts/run_golden.mjs        # 金标 52 题：命中 / 引用率
node scripts/e2e.mjs               # 端到端 7 步
node scripts/check_package.mjs     # 打包检查
```

当前基线：**金标 52/52 = 100%**，含引用 50/50 = **100%**（API 卡补 sources 后从 82% 提升）；E2E 7/7；检测器 22 条；面板内嵌 346 卡。

## 安装

### 方式 1：GitHub 仓库地址（推荐给开源用户）

在 Harness 的「插件」→「添加插件」里直接填仓库地址：

```
https://github.com/zixiaog/dsh-harmony-dev
```

或命令行：

```bash
dsh plugin add https://github.com/zixiaog/dsh-harmony-dev
```

安装时 `prepare` 会自动生成面板数据（`client.js`），无需 Python。

### 方式 2：npm 包名（发布后）

```
dsh-harmony-dev
```

### 方式 3：本地目录（开发调试）

让 harness 的 `plugin_manager` 用 **绝对目录** 安装：

```
plugin_manager install_bundle  target = <workspace>/dsh-harmony-dev
```

- 新装可经 HMR 热生效；**替换同名包需重启**。
- 不要手抄进 `node_modules`（下次 `pnpm install` 会被清进 `.ignored`）。

### 安装后验证

- 工具表出现 `harmony_search` / `harmony_get` / `harmony_build` / `harmony_create` / `harmony_check`
- 左侧栏出现「鸿蒙开发台」图标（线性图标），点开五 Tab 面板
- 说一句「用 harmony_search 查一下列表懒加载」应返回卡片 + 规则 + 官方片段

## 装完怎么验

1. 模型工具表出现 `harmony_search` / `harmony_get`（问一句「用 harmony_search 查一下间距」）。
2. 左侧栏出现「鸿蒙开发台」图标，点开是整页面板，四个 Tab 可切换。
3. `harmony_search {query:"列表 懒加载"}` 命中 `comp.list` 并带官方出处。
4. `harmony_get {ref:"R003"}` 返回规则与修法；`{ref:"Title_L"}` 返回 30vp/Bold。
5. `harmony_get {ref:"24→26", kind:"version"}` 返回该区间的 API 变更；`harmony_search {query:"列表", targetApi:"API 6"}` 会排除 `since` 高于基线的卡片并给出警告。
6. `harmony_build {action:"tokens"}` 返回 `Tokens.ets`；`{action:"page", name:"DetailPage", layout:"settings"}` 返回页面 + 自查报告（应 pass）。
7. `harmony_search {query:"List 滑动删除 swipeAction"}` 的 `data.official.docs` 应返回官方文档片段（首次调用可能耗时数秒）；把 `mcp` 配成假端点或断网时应看到降级告警。
8. `harmony_check {action:"review", code:"..."}` 应返回规则 id/行号/修法/出处与 `verdict`（有 error 即 blocked）；`{action:"version", from:"6.1.1(24)", to:"26.0.0"}` 返回该区间变更。
9. `harmony_create {name:"DemoApp", template:"tabs"}` 应在 `<当前目录>/harmony-projects/DemoApp` 生成 20 个文件；DevEco 打开 → Sync → 自动签名 → 运行。

## 已知限制

- **官方通道首次调用较慢**：initialize + 检索两轮 RTT，默认超时 12s；失败或超时会熔断 60s 并降级本地快照（`warnings` 里会说明）。
- **`since` 仍有 159 张 API 卡标「待校准」**：官方索引只给文档链接，不给 API level；要补准确值需逐 Kit 解析 apidiff 页。
- **34 条规则中 22 条可执行**；其余（元服务能力、隐私合规、深度复用等）为人工清单项。
- **32 张 API 卡未匹配到官方出处**（state management、animateTo、window 等），`sources` 为空。
- 示例 20 个是「可读文件」，未在 DevEco 编译验证。
- **`harmony_create` 只生成骨架**：不编译、不签名、不上架；默认目录为宿主进程 cwd（profile 目录）下的 `harmony-projects/`，建议显式传 `path` 到你的工程目录。
- 面板渲染我只验证了 slot 注册与内嵌数据，观感需你刷新确认。

## 踩坑记录（三条，都是实测踩出来的）

### 1. 本地目录安装（Junction）时，不要用 `Service` 类 + `import('@deepseek-ai/cordis')`

- 现象：`application: applied`，客户端面板正常，但工具表里没有 `harmony_*`。
- 日志只有 `module imported` → `WARN cannot import cordis: Cannot find package '@deepseek-ai/cordis' — stub base` → `constructor called`，**没有 `Service.init start`**。
- 原因：Junction 的真实路径在工作区，Node 从那里解析不到宿主内的 cordis；落到 stub 基类后 `[Service.init]` 符号对不上，注入不被驱动。
- 修复：用函数式 `export function apply(ctx, config)` + `export const inject = ['tools']`，不 import cordis。

### 2. 函数式插件必须导出 `name`

- 只导出 `apply` + `inject` 时：模块被 import 但 `apply` 不被调用（日志只有 `module imported`）。
- 修复：`export const name = 'harmony-dev-kit';`。已装插件 `dsh-pet` 的导出正是 `export { apply, inject, name }`。

### 3. `export const Config` 不能是普通 JSON Schema

- 现象：`set_bundle` 报 `application: failed` → `TypeError: Cannot read properties of undefined (reading 'validate')`。
- 原因：cordis 激活时会调用 `Config.validate()`；JSON Schema 没有这个方法。
- 修复：M0 不导出 `Config`，参数走 `apply(ctx, config)` 里的默认值；要可配置时再补 **zod 形态**（带 `validate`）。

### 4. 生效方式：toggle 重载的是「代码模块」，不是「数据文件」

- **`plugin_manager set_bundle enabled=false → true` 会重新激活插件**；若 `index.js` 内容变了，宿主会重新 import（本次靠它热修成功）。
- **只改数据（`data/*.json`）不会触发重新 import**：模块被缓存，`apply` 里读到的还是旧数据。解决办法：给 `index.js` 加一行注释/版本标记（改变文件内容）→ 再 toggle；或者重启 Harness。
- 客户端改动走 client HMR，不受影响。

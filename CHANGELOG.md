# Changelog

所有值得记录的变更都会写入这里。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-11-05

首个公开版本。

### Added

- **5 个 Host 工具**
  - `harmony_search`：本地 366 条内容 + 34 条规则 + token + 华为官方知识库（MCP）联合检索，支持 `targetApi` 基线过滤
  - `harmony_get`：按 ref 取组件卡 / 规则 / token / 版本表 / 版本差异 / 官方全文
  - `harmony_build`：生成 `Tokens.ets`、Stage 工程骨架、页面模板（settings/list），自带规范自查
  - `harmony_check`：review / migrate（V1→V2）/ a11y / one_multi / version / release，22 条规则可执行
  - `harmony_create`：直接落盘生成可在 DevEco 打开的 Stage 工程（20 文件，empty/tabs/list/settings）
- **内容数据**：40 组件卡 + 60 设计规范 + 200 API 卡 + 46 讲课程 + 20 示例 = 366 条；1211 个可下钻主题（4 精编 + 33 个 Kit 官方目录 + 自动整理）
- **规则库**：34 条规则（L1 24 / L2 7 / L3 3），16 例正反例回归
- **版本能力**：14 个版本对照、9 条 apidiff、双基线（默认 6.1.1(24) / 上限 26.0.0）
- **Client 面板**：五 Tab（token / 规则 / 内容库 / 示例 / 版本），三级目录 + 折叠分组 + 主题下钻 + 基线切换 + 复制代码
- **官方通道**：内置最小 JSON-RPC MCP 客户端（12s 超时、60s 熔断、自动降级本地）
- **质量门**：`test_m0.mjs` / `check_rules.py` / `run_golden.mjs`（金标 52 题，命中 100% / 引用 100%）/ `e2e.mjs` / `check_package.mjs`
- **文档**：README、使用手册、内容贡献指南、架构与接入、设计方案、LICENSE、CONTRIBUTING、SECURITY

### Known limitations

- API 卡 `since` 仍有约 159 条待逐 Kit 校准
- 19 条 Kit 主题正文为本地补写（已标注 `note`），非官方原文
- 示例 20 个未在 DevEco 编译验证
- `harmony_create` 只生成骨架，不编译、不签名、不上架

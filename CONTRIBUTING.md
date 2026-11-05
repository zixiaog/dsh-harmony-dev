# 贡献指南 · dsh-harmony-dev

感谢参与！这个项目由两部分组成：

1. **插件代码**（Host 工具 / Client 面板 / 检查器）
2. **鸿蒙内容数据**（组件卡、设计规范、API 卡、课程、示例、规则）

## 开发环境

- Node.js ≥ 20（跑脚本与自测）
- Python ≥ 3.9（仅当修改内容源时需要；`PyYAML`）
- 可选：DevEco Studio（验证生成的工程、跑示例）

## 本地开发

```bash
git clone https://github.com/zixiaog/dsh-harmony-dev.git
cd dsh-harmony-dev

# 安装依赖（仅开发期需要）
npm install

# 改代码后
node --check index.js
node scripts/test_m0.mjs      # 5 工具自测
node scripts/e2e.mjs          # 端到端 7 步

# 改内容（content/*.yaml、rules/）后
python scripts/build_data.py  # 校验 + 生成 data/*.json
node scripts/build-client.mjs # 生成面板数据
python scripts/check_rules.py # 规则正反例回归
node scripts/run_golden.mjs   # 金标 52 题
```

## 内容贡献

卡片 schema、紧凑写法、topics（主题）规范见 [`docs/内容贡献指南.md`](docs/内容贡献指南.md)。

硬约束：

- `since` 必须有出处（apidiff / 官方页），不确定写 `—` 并加 `version_note`
- `severity: error` 的规则必须有 `spec.url`，`calibrated:false` 不得阻断
- token 引用不得使用缺号（间距无 l14/l15/l24/l31，圆角无 level14/15/17）
- 设计条目必须能对应官方设计规范目录

## 提交前检查

```bash
node scripts/test_m0.mjs
python scripts/check_rules.py
node scripts/run_golden.mjs
node scripts/e2e.mjs
node scripts/check_package.mjs
```

全部通过再提 PR。CI 未接入 GitHub Actions 时，以这些命令为准。

## 提交信息

建议约定式提交：

```
feat(tool): add harmony_create project generator
fix(check): handle nested braces in R014
docs(content): enrich UI Design Kit topics
chore(release): 0.1.0
```

## 发布

- 版本号遵循 SemVer，改动记录到 [`CHANGELOG.md`](CHANGELOG.md)
- 发布前必须提交构建产物：`data/*.json`、`client.js`（安装方不跑 Python 构建）
- npm 发布：`npm publish`（包名 `dsh-harmony-dev`）
- GitHub 安装：仓库根 `package.json` 的 `files` 已包含运行时所需文件

## 行为准则

- 只提交有出处的鸿蒙内容，不复制官方文档整段正文
- 不提交签名、证书、账号 token 等敏感信息
- 讨论保持技术化，尊重不同实现选择

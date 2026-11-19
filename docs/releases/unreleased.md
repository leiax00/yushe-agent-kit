# Unreleased

## Added
- yak CLI（`bin/yak.js`，零依赖）：`install <target>` / `list` / `update` / `doctor`；registry 为目标映射唯一权威，未核实目录约定的目标拒绝安装；软链优先复制兜底
- `yushe-user-rules` 插件源入仓：`.agents/dsh/plugins/yushe-user-rules/`（v0.3.0），由 CLI 一并安装
- 协作规则体系：`.agents/rules/`（交互原则、git 规范、文档底线），DSH 经 yushe-user-rules 插件机制注入
- `yx-docs` skill：文档体系（分形布局、读写协议、决策记录、发版记录、何时写对照表）
- skill 命名统一 `yx-` 前缀

## Changed
- `docs-management` 规则瘦身为底线并指向 `yx-docs` skill
- 文档结构重组为 usage/tech/standards/releases + glossary + AUTHORING（原 USAGE.md/AUTHORING.md 拆分迁移）

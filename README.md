# Yushe Agent Kit

> One-command install of skills, commands, rules & hooks for AI coding agents — Claude Code, Codex, OpenCode, Gemini CLI, DSH and more.

一套围绕 vibe coding 沉淀的智能体脚手架资源库：skills、commands、rules、hooks 等，单一源目录维护，一键安装到各类 agent CLI。

## 仓库结构

```text
yushe-agent-kit/
├── README.md
├── AGENTS.md            # 贡献/维护本仓库时 agent 应遵循的约定
└── .agents/
    ├── docs/
    │   ├── USAGE.md     # skills 的使用与触发方式
    │   └── AUTHORING.md # skill 的编写规范
    ├── rules/           # 协作规则源（机制注入，见下节）
    ├── skills/          # skill 源（单一事实来源）
    └── (commands/ hooks/ … 随内容增加逐步建立)
```

`.agents/skills/` 是多个 agent CLI 正在收敛的项目级 skills 约定路径，本仓库本身就是一个合法的 agent 工作区——克隆即可被识别，无需先安装。

## Rules（协作规则）

`.agents/rules/` 存放**由机制注入、不依赖模型判断**的强制约定（Claude Code rules 语义）：

| Rule | 注入方式 | 内容 |
|---|---|---|
| `interaction.md` | `alwaysApply: true`，每会话首步注入 | vibe coding 交互原则：简体中文语言规则、先读后写、小步推进、诚实汇报 |
| `git-workflow.md` | `alwaysApply: true`，每会话首步注入 | 简化 trunk-based 分支、`type(scope): 中文描述` 提交格式、提交/推送双授权安全边界 |
| `docs-management.md` | `paths: **/*.md` 门控，首次读写 md 时注入 | 文档放置、单一权威定义、链接同步、写作风格 |

**加载机制**：DSH 通过 `yushe-user-rules` 插件（`.agents/rules` 为最高优先级源）自动注入；Claude Code 原生支持 rules 目录；其余 CLI 由安装器映射。规则与 skills 的分工：**rules = 机制注入的强制约定，skills = 模型按任务加载的领域知识**。

## Skills 一览

| Skill | 覆盖范围 |
|---|---|
| `yx-backend-architecture` | 后端模块、服务编排与持久化边界；Java/Spring Boot/MyBatis-Plus 完整规范，TypeScript/Python/Go 基础指南 |
| `yx-frontend-architecture` | 前端业务模块、组件边界、状态、表单与异步交互（React/Vue + TS） |
| `yx-api-design` | HTTP API 契约、资源命名、分页、错误、幂等与兼容性 |
| `yx-database-design` | 关系型表、约束、索引、事务策略与可演进迁移（MySQL/PostgreSQL） |
| `yx-docs` | 文档读取与写作：分形布局（单服务/monorepo/模块）、产品/技术/使用文档、决策记录（notes）、发版记录（docs/releases/） |

各 skill 互相按任务显式协作（改契约加载 yx-api-design、改模型加载 yx-database-design），不自动依赖。

## 安装

### DSH（DeepSeek Harness）

```bash
# 全局：软链到 DSH skills 目录（更新源即生效）
ln -s /path/to/yushe-agent-kit/.agents/skills/yx-backend-architecture ~/.dsh/skills/yx-backend-architecture

# 或项目级：把 .agents/skills/ 内容放入项目根的 .agents/skills/
```

### Claude Code / Codex / OpenCode 等

安装器开发中（`npx yushe-agent-kit install <target>`，映射 `.agents/skills/` 到各工具的目标目录）。当前可手动复制：

- Claude Code：`~/.claude/skills/<name>/`
- OpenCode：项目 `.agents/skills/` 或其全局配置目录
- 其余工具按各自 skills 目录约定放置

## 维护原则

- **单一源**：所有资源只在 `.agents/` 下维护一份，各 CLI 目录一律由源映射（复制或软链），不双写。
- **条件加载**：skill 采用路由式 SKILL.md + 按任务加载的 references，反对一次性灌入全部规范。
- **跨语言原则上浮**：原则性内容（KISS/YAGNI、代码整洁、设计模式选择）放 `references/common/`，语言专属细则放各自语言目录。

详见 [AGENTS.md](AGENTS.md) 与 [docs/](docs/)。

## License

MIT

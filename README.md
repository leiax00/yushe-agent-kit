# Yushe Agent Kit

> One-command install of skills, commands, rules & hooks for AI coding agents — Claude Code, Codex, OpenCode, Gemini CLI, DSH and more.

一套围绕 vibe coding 沉淀的智能体脚手架资源库：skills、commands、rules、hooks 等，单一源目录维护，一键安装到各类 agent CLI。

## 仓库结构

```text
yushe-agent-kit/
├── README.md / AGENTS.md   # 入口路由 / 维护约定
├── package.json / bin/     # yak CLI（单包发布，资源即载荷）
├── src/cli/                # CLI 实现（targets/registry.js 为映射唯一权威）
├── docs/                   # 本仓库文档（yx-docs 单服务形态）
│   ├── usage/              #   安装、DSH 发现机制
│   ├── tech/               #   架构综述（资源模型、rules/skills 分工）
│   ├── standards/          #   skill 编写规范
│   ├── releases/           #   发版记录
│   ├── glossary.md         #   术语表
│   └── AUTHORING.md        #   贡献指南
└── .agents/
    ├── rules/              # 协作规则源（机制注入，见下节）
    ├── notes/              # 决策记录（proposed/implemented/rejected）
    ├── dsh/                # DSH 专属资源（plugins/yushe-user-rules：rules 注入机制）
    ├── skills/             # skill 源（单一事实来源）
    └── (claude/ opencode/ … 其他工具专属目录随内容建立)
```

`.agents/skills/` 是多个 agent CLI 正在收敛的项目级 skills 约定路径，本仓库本身就是一个合法的 agent 工作区——克隆即可被识别，无需先安装。文档体系遵循本 kit 的 `yx-docs` skill 约定（何时写、放哪里、怎么读写详见该 skill）。

## Rules（协作规则）

`.agents/rules/` 存放**由机制注入、不依赖模型判断**的强制约定（Claude Code rules 语义）：

| Rule | 注入方式 | 内容 |
|---|---|---|
| `interaction.md` | `alwaysApply: true`，每会话首步注入 | vibe coding 交互原则：简体中文语言规则、先读后写、小步推进、诚实汇报 |
| `git-workflow.md` | `alwaysApply: true`，每会话首步注入 | 简化 trunk-based 分支、`type(scope): 中文描述` 提交格式、提交/推送双授权安全边界 |
| `docs-management.md` | `paths: **/*.md` 门控，首次读写 md 时注入 | 文档放置、单一权威定义、链接同步、写作风格 |

**加载机制**：DSH 通过 `yushe-user-rules` 插件（`.agents/rules` 为最高优先级源）自动注入——插件源在本仓库 [`.agents/dsh/plugins/yushe-user-rules/`](.agents/dsh/plugins/yushe-user-rules/README.md)，安装方式见 [docs/usage/install.md](docs/usage/install.md)；Claude Code 原生支持 rules 目录；其余 CLI 由安装器映射。规则与 skills 的分工：**rules = 机制注入的强制约定，skills = 模型按任务加载的领域知识**。

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

推荐 yak CLI（发布后 `npx @leiax00/yushe-agent-kit install <target>`；开发期 `npm run dev -- <cmd>` 或 `npm run build && node dist/bin/yak.js <cmd>`）：

```bash
npx @leiax00/yushe-agent-kit install dsh      # skills 软链 + rules 插件安装
npx @leiax00/yushe-agent-kit install claude   # skills 软链 + rules 复制到项目 .claude/rules/
npx @leiax00/yushe-agent-kit doctor           # 诊断遮蔽、双源、失效软链
```

详见 [docs/usage/install.md](docs/usage/install.md)；DSH 发现机制与排障见 [docs/usage/dsh-discovery.md](docs/usage/dsh-discovery.md)。未核实目录约定的目标（opencode/codex/gemini）CLI 会拒绝安装，核实后在 [src/cli/targets/registry.js](src/cli/targets/registry.js) 登记映射。

## 维护原则

- **单一源**：所有资源只在 `.agents/` 下维护一份，各 CLI 目录一律由源映射（复制或软链），不双写。
- **条件加载**：skill 采用路由式 SKILL.md + 按任务加载的 references，反对一次性灌入全部规范。
- **跨语言原则上浮**：原则性内容（KISS/YAGNI、代码整洁、设计模式选择）放 `references/common/`，语言专属细则放各自语言目录。

详见 [AGENTS.md](AGENTS.md) 与 [docs/](docs/)。

## License

MIT

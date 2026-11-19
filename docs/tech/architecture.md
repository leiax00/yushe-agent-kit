# 架构

> 受众：维护者与 agent ｜ 范围：本 kit 的资源模型与文档结构 ｜ 最后核实：2026-11-18

## 定位

智能体脚手架资源的**单一事实来源**：skills、rules（commands/hooks 随内容增加建立）。各 CLI 工具的目录只能由源映射产生（软链/复制/安装器），禁止目标侧修改后回漏。

## 资源模型：rules 与 skills 的分工

| 载体 | 性质 | 加载方式 | 适合的内容 |
|---|---|---|---|
| `.agents/rules/*.md` | 强制约定 | **机制注入**（DSH 经 kit 整体插件的 rules 组件；Claude Code 原生支持），可选 frontmatter 门控（`alwaysApply`/`paths`） | 每会话必守的底线、按文件类型触发的强制规则 |
| `.agents/skills/<name>/` | 领域知识 | **模型按任务加载**（SKILL.md 路由 + references 条件加载） | 触发条件在用户消息中可见的任务型知识 |

判定标准：模型能否可靠判断"何时需要"——不能（新会话/压缩后）走机制注入，能（git 操作、文档读写、架构设计）走 skill。

## Skills

8 个 skill，`yx-` 前缀，互相显式协作不自动依赖：

- `yx-backend-architecture` / `yx-frontend-architecture`：实现与评审规范（Java 完整，TS/Python/Go 基础指南）
- `yx-api-design` / `yx-database-design`：契约与数据设计
- `yx-docs`：文档体系（结构/读/写/记录，含本仓库文档结构的定义）
- `yx-task-kickoff` / `yx-task-wrapup`：任务启动与收尾流程（类型/场景判类，成对使用）
- `yx-release`：发版流程（版本决策、记录迁移、tag 与渠道发布）

设计约定（详见 [skill 编写规范](../standards/skill-authoring.md)）：入口纯路由 ≤100 行、references 一文件一主题、RFC 2119 强度、诚实标注成熟度。

## 决策记录

`.agents/notes/`：一次变更一条记录，与特性分支对应；proposed → implemented，rejected 保留防重复踩坑。本 kit 自身的设计决策（如 rules/skills 分工、yx-docs 结构取舍）均记录于此。

## 本仓库文档结构

单服务形态：

```text
docs/
├── usage/          # install.md、dsh-discovery.md
├── tech/           # 本文件（架构综述）
├── standards/      # skill-authoring.md（skill 编写规范）
├── releases/       # unreleased.md（发版记录）
├── glossary.md     # 术语表
└── AUTHORING.md    # 贡献指南
```

暂不预建：product/（工具库无产品定义需求）、modules/（skills 自含文档即模块文档；CLI 的模块文档待其稳定后再建）、references/、iterations/、apis/——有实料再建。

## yak CLI（安装器）

单包发布：根 `package.json`（bin: `yak` / `yushe-agent-kit`，TypeScript 源码 → `dist/` 产物分发，运行时依赖 commander），`.agents/` 载荷随包分发，`npx @leiax00/yushe-agent-kit install <target>` 安装到各工具。**依赖边界**：CLI 可用外部依赖；`.agents/dsh/plugins/*` 保持零依赖（link: 安装不装依赖，插件硬约束）。

- `src/cli/targets/registry.js` 是"资源 → 目标路径"映射的**唯一权威**；未核实目录约定的目标拒绝安装。
- 软链优先、复制兜底；实体目录判 conflict 不覆盖（保护用户自有安装）。
- `doctor` 诊断实际踩过的坑：项目 `.dsh/skills` 遮蔽、双源副本、失效软链、SKILL.md 命名不一致。
- 设计取舍详见 [.agents/notes/implemented/feature/2026-11-19-yak-cli.md](../../.agents/notes/implemented/feature/2026-11-19-yak-cli.md)。

## 安装映射

映射唯一权威是 [src/cli/targets/registry.js](../../src/cli/targets/registry.js)；已支持 DSH 与 Claude Code，其余目标核实目录约定后登记。

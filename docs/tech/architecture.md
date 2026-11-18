# 架构

> 受众：维护者与 agent ｜ 范围：本 kit 的资源模型与文档结构 ｜ 最后核实：2026-11-18

## 定位

智能体脚手架资源的**单一事实来源**：skills、rules（commands/hooks 随内容增加建立）。各 CLI 工具的目录只能由源映射产生（软链/复制/安装器），禁止目标侧修改后回漏。

## 资源模型：rules 与 skills 的分工

| 载体 | 性质 | 加载方式 | 适合的内容 |
|---|---|---|---|
| `.agents/rules/*.md` | 强制约定 | **机制注入**（DSH 经 yushe-user-rules 插件；Claude Code 原生支持），可选 frontmatter 门控（`alwaysApply`/`paths`） | 每会话必守的底线、按文件类型触发的强制规则 |
| `.agents/skills/<name>/` | 领域知识 | **模型按任务加载**（SKILL.md 路由 + references 条件加载） | 触发条件在用户消息中可见的任务型知识 |

判定标准：模型能否可靠判断"何时需要"——不能（新会话/压缩后）走机制注入，能（git 操作、文档读写、架构设计）走 skill。

## Skills

5 个 skill，`yx-` 前缀，互相显式协作不自动依赖：

- `yx-backend-architecture` / `yx-frontend-architecture`：实现与评审规范（Java 完整，TS/Python/Go 基础指南）
- `yx-api-design` / `yx-database-design`：契约与数据设计
- `yx-docs`：文档体系（结构/读/写/记录，含本仓库文档结构的定义）

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

暂不预建：product/（工具库无产品定义需求）、modules/（skills 自含文档即模块文档）、references/、iterations/、apis/——有实料再建。

## 安装映射（规划）

安装器实现后，各工具的目标路径映射在 [AGENTS.md](../AGENTS.md) 登记并与 README 保持一致。

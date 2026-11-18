# 术语表

> 受众：所有人 ｜ 范围：本 kit 体系内使用的术语 ｜ 最后核实：2026-11-18

## kit

yushe-agent-kit 本身：智能体脚手架资源的单一事实来源仓库。

## skill（技能）

模型按任务加载的领域知识单元：`SKILL.md`（纯路由入口）+ `references/`（条件加载的正文）。触发条件在用户消息中可见的任务适合做成 skill。

## rule（规则）

由宿主机制注入、不依赖模型判断的强制约定，存放于 `.agents/rules/`，支持 frontmatter 门控（`alwaysApply` 恒载 / `paths` 文件匹配门控）。模型无法可靠判定触发时机的约定必须走 rule（如"新会话必读"）。

## 机制注入

由宿主（DSH 插件 / Claude Code 原生 rules / AGENTS.md 自动加载）在会话首步或文件操作时确定性地把内容送入模型上下文，区别于模型自主决定加载 skill。

## references

skill 内按主题拆分的正文文件；一行路由对应一个主题，多主题任务取并集，不递归全量加载。

## note（决策记录）

`.agents/notes/` 下记录"代码装不下的为什么"的文档：背景、决策、被放弃的替代方案。生命周期编码进路径（proposed/implemented/rejected）。与 agent 执行日志不同——过程性记录不落库。

## 单一事实来源（single source of truth）

同一规则/资源只在本仓库 `.agents/` 下维护一份；各 CLI 目录由源映射产生，目标侧修改视为违规回漏。

## 就近原则（nearest wins）

文档放在能完整覆盖其描述对象的最小层级；一个单元的问题先查单元内文档，找不到再上溯。

## 单一权威定义

同一规则/事实只在一处定义，其他位置放链接；发现重复表述时收敛到权威处。

## 四层记录分工

git history（事实）→ releases/（版本对外变化）→ 模块 history.md（机制演进）→ notes（决策理由），互不重复。

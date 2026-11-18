# 贡献指南

> 受众：向本 kit 贡献 skill/rule 的维护者与 agent ｜ 范围：本仓库的变更流程 ｜ 最后核实：2026-11-18

1. 修改前先读目标 skill 的 SKILL.md 路由与 [AGENTS.md](../AGENTS.md)，确认改动落在正确文件；规则重复时收敛到权威定义处，不打第二处补丁。
2. 编写/修订 skill 结构遵循 [skill 编写规范](standards/skill-authoring.md)；文档类变更遵循 `yx-docs` skill（结构、模板、何时写）。
3. 何时写哪些文档见 `yx-docs` 的 when-to-write 对照表；本仓库自己的文档结构见 [tech/architecture.md](tech/architecture.md)。
4. 提交遵循 `.agents/rules/git-workflow.md`：`type(scope): 中文描述`，一次提交一个主题；提交与推送是两个独立授权阶段。
5. 结构调整（移动/改名）必须同步更新所有引用链接。
6. skill 命名统一 `yx-` 前缀；协作类强制约定放 `.agents/rules/`，不做成 skill。

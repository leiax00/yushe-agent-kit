# DSH 中文架构 Skills 使用说明

## 安装位置与适用范围

四个独立入口位于项目根目录 `.agents/skills/`，未修改全局配置、容器配置或现有业务文件。完整目录可复制到其他项目根目录；不要同时复制到 `.dsh/skills/` 造成同名重复。

当前 `/workspace/code/self/ai-work` 未检测到 Git 根，因此将 DSH 会话工作目录设为这个目录。若从其子目录启动，无 Git 根时 DSH 会把子目录自身当根，不能依赖向上搜索 `.dsh`。将来若加入上层 Git 仓库，需重新确认实际项目根。

## 实际发现方式

已核对官方文档及本机 DSH 文件提供器。默认文件根的优先级为：项目 `.dsh/skills` → 项目 `.agents/skills` → 配置的 customSkillDirs → 用户 dshHome/skills → 用户 agentsHome/skills → 可配置 bundled 根。这里是同一作用域层内的文件来源顺序；额外运行时/作用域提供器也可能影响同名选择。

用户根默认由 DSH_HOME（否则 ~/.dsh）和 DSH_AGENTS_HOME（否则 ~/.agents）决定。项目根为最近包含 `.git` 的祖先，没有则为当前会话 cwd。默认根必须在文件提供器中启用。

根目录直接下的 `<name>/SKILL.md` 和 `<name>.md` 可被识别；不递归发现任意深度的 SKILL.md。本体系使用目录形式，references 只是资源，不是额外 Skill。

DSH 先提供名称/描述目录，模型通过 `skill({"name":"backend-architecture"})` 加载正文；这是模型工具调用示意，不是终端命令。正文加载后根据相对路径按需读取 references，不会自动全部加载，也没有这里四个 Skill 之间的自动继承。

需要配置 skill registry、skill-filesystem 和 tool-skill。默认调用策略允许模型和用户调用，本套没有限制这些策略。UI 的斜杠调用支持需看所用客户端；以技能选择器实际显示为准，正文也可直接要求“请加载 backend-architecture Skill”。

## 使用示例

在该目录运行 `dsh` 或将 Web 会话工作目录设为该目录，再发送：

- 请加载 backend-architecture，按现有 Spring Boot/MyBatis-Plus 结构实现订单取消，重点检查事务和并发。
- 请加载 frontend-architecture，检查搜索页面的状态归属、旧响应覆盖和失败反馈。
- 请加载 database-design，为订单业务编号设计租户内唯一约束和兼容迁移。
- 请加载 api-design，设计订单列表接口，定义分页、错误和权限语义。
- 请依次加载 api-design 与 backend-architecture，实现创建订单；如果需要改变表结构，再加载 database-design。

让模型先报告加载的 Skill 和参考路径，可确认路由。若没出现，先检查会话 cwd、元数据、同名遮蔽和所用 profile 的提供器；新建会话可辅助排查缓存，但不能替代修复配置。

容器部署说明记录 `/workspace` 同路径挂载，因此文件具备被容器读取的路径条件；仍需确认实际运行容器挂载和会话 cwd。本次不修改运行服务，也不把宿主验证等同于容器/Web UI 验证。

## 来源与验证范围

核对日期：2026-11-18。官方说明：https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills

本机源码：`/workspace/code/github/deepseek-harness`，检查时 HEAD `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`，skill-filesystem 包版本 `0.2.2-rc.3`。具体证据位于 `packages/skill/skill-filesystem/src/index.ts` 的 roots、discoverRoot、findProjectRoot、parseSkillFile，以及 `docs/subsystems/skills.md`。

目标目录内的容器构建记录指向较早提交 `504a01a9578abc2c6f1fb896b1dc322c9fe24f66`；宿主源码版本不代表运行容器版本。验证报告另见交付报告。

## 本轮修订

按原讨论恢复 Java 的 api/internal、internal/web、用例组织和 DO 命名；补充 data-objects.md、integrations.md、enums-and-constants.md。原 .dsh/skills 下这四个同名目录应迁出发现根并备份，不能保留两份，因为项目 .dsh 优先于 .agents。

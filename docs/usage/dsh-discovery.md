# DSH 发现机制

> 受众：维护本 kit / 排查 skill 不生效的人 ｜ 范围：DSH 如何发现并加载 skills ｜ 最后核实：2026-11-18（按 DSH 0.2.2-rc.3 / 提交 38a6a5c9）

## 发现根优先级

同一作用域层内的文件来源顺序：

项目 `.dsh/skills` → 项目 `.agents/skills` → 配置的 customSkillDirs → 用户 dshHome/skills → 用户 agentsHome/skills → 可配置 bundled 根。

- 用户根由 `DSH_HOME`（否则 `~/.dsh`）和 `DSH_AGENTS_HOME`（否则 `~/.agents`）决定。
- 项目根 = 最近包含 `.git` 的祖先；没有 git 根时为会话 cwd——从子目录启动且无 `.git` 时不能依赖向上搜索。
- 默认根必须在文件提供器（skill registry、skill-filesystem、tool-skill）中启用。

## 入口识别

- 只识别根目录直接下的 `<name>/SKILL.md` 和 `<name>.md`；**不递归**发现任意深度的 SKILL.md。
- 本 kit 使用目录形式；`references/` 只是资源，不是额外 skill。

## 加载模型

DSH 先向模型提供名称/描述目录；模型通过 skill 工具调用加载正文（`skill({"name":"yx-backend-architecture"})` 是工具调用示意，不是终端命令）。正文加载后按相对路径**按需**读取 references，不会全量加载，skill 之间也没有自动继承或依赖。

默认调用策略允许模型和用户调用。UI 斜杠调用支持取决于客户端；正文也可直接要求"请加载 yx-xxx Skill"。

## 排查 skill 不生效

1. 确认会话 cwd 与项目根推断正确。
2. 检查 SKILL.md 的 YAML frontmatter（name 非空且与目录一致）。
3. 检查是否有同名目录在更高优先级根造成遮蔽（尤其项目 `.dsh/skills`）。
4. 新建会话排除缓存因素；缓存排查不替代配置修复。

## 来源

- 官方文档：https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/skills
- 本机源码：`packages/skill/skill-filesystem/src/index.ts`（roots、discoverRoot、findProjectRoot、parseSkillFile）

# rules 与 skills 的载体分工

> 状态：implemented ｜ 提出于 2026-11-18

## 背景

最初把交互原则、git 规范、文档规范写成 `yx-project-interaction` skill，靠 SKILL.md description 声明"新会话/压缩后加载"。问题：skill 的加载是模型判断触发的，而"这是新会话""上下文刚被压缩"不在用户消息里，模型无法可靠判定；压缩对模型是透明的（压缩只折叠对话历史，系统提示不受影响，但 skill 正文不在系统提示里）。

## 决策

按"模型能否可靠判断何时需要"划分载体：

- **不能判定的强制约定 → `.agents/rules/`**，由宿主机制注入。DSH 经 yushe-user-rules 插件（`.agents/rules` 最高优先级源），Claude Code 原生支持 rules。frontmatter 门控：`alwaysApply: true` 恒载（交互原则、git 规范）；`paths: **/*.md` 文件匹配门控（文档底线——文件读写是确定性信号，比模型判断更可靠）。
- **能判定的任务型知识 → skills**，模型按任务加载。

`yx-project-interaction` skill 因此删除，内容迁入三条 rules。

## 放弃的替代方案

- 用 DSH 插件在 `agent/created` 时注入引导消息：只覆盖会话启动，且引入 DSH 专属依赖；rules 目录是多 CLI 收敛路径。
- AGENTS.md 承载全部约定：AGENTS.md 每会话自动注入适合少量核心内容，但无法按文件类型门控，且各 CLI 对 AGENTS.md 支持不一。

## 后果

- kit 的资源分两层：rules = 机制注入的强制约定，skills = 模型按任务加载的领域知识。
- 新增约定时先问触发时机是否模型可判定，再选载体。

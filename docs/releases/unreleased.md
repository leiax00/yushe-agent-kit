# Unreleased

## Added
- yak CLI（`bin/yak.js`，零依赖）：`install <target>` / `list` / `update` / `doctor`；registry 为目标映射唯一权威，未核实目录约定的目标拒绝安装；软链优先复制兜底
- 协作规则体系：`.agents/rules/`（交互原则、git 规范、文档底线），DSH 经 kit 整体插件注入、Claude Code 原生机制注入
- `yx-docs` skill：文档体系（分形布局、读写协议、决策记录、发版记录、何时写对照表）
- skill 命名统一 `yx-` 前缀
- `yx-task-kickoff` skill：任务启动流程（迭代/大任务/小任务/修 bug/继续任务 + 开分支与 worktree 操作流程）
- `yx-task-wrapup` skill：任务收尾流程（正常完成/中止不合入/迭代收尾 + 分支与 worktree 清理，含文档同步检查清单）
- `yx-release` skill：发版流程（semver 版本决策与版本策略判定、发版记录迁移、tag 与渠道发布；版本落位分技术栈参考 npm/Maven/Python/Go，发布形态覆盖发库与微服务服务级部署）
- kit 整体插件：一个 npm 包通过两个子路径组件提供 DSH 插件，skills provider（rank 600，项目/用户级同名可覆盖）+ 双层 rules 注入；Plugin Manager 分别显示为 **Yushe Agent Kit Skills** 与 **Yushe Agent Kit Rules** 并独立开关

## Changed
- git-workflow 规则新增合入方式约定：单笔或少量简单提交快进合并（`--ff-only`），多提交且各提交有意义时保留 merge 节点；wrapup 收尾参考同步
- `yx-api-design` 明确 API schema 以 OpenAPI 源文件为载体：源文件唯一、design-first 默认、布局引用 yx-docs、错误结构入可复用 schema
- `docs-management` 规则瘦身为底线并指向 `yx-docs` skill
- 文档结构重组为 usage/tech/standards/releases + glossary + AUTHORING（原 USAGE.md/AUTHORING.md 拆分迁移）
- git 分支模型改为"任务分支沙箱"：门禁后移至合入前、允许 checkpoint 提交、同机并行用 worktree 隔离、提交授权分两级
- 安装模型：DSH 收敛为整体插件单一通道（`install dsh` = 确保插件已装）；CLI 支持 `install <target> <path>` 项目级整体落位；Claude Code 用户级软链 + 项目级相对软链双模式
- rules 注入引擎（scan/engine/render/frontmatter/glob）并入包内 `src/plugin/rules-engine/`，`yushe-user-rules` 独立插件退役（`.agents/dsh/` 目录移除）

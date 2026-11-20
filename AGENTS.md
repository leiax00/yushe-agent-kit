# AGENTS.md — 本仓库的工作约定

在本仓库内做任何改动（新增 skill、修订规范、调整结构）的 agent，遵循以下约定。

## 仓库定位

这是智能体脚手架资源的**单一事实来源**：skills、rules、各工具专属的 plugins/commands/hooks 全部在 `.agents/` 下维护一份（通用资源在顶层，工具专属资源在 `.agents/<target>/`）；各 CLI 工具的目录只能由源映射产生，禁止在目标侧直接修改后回漏。

## 目录与归属

- `.agents/skills/<name>/SKILL.md` — skill 入口，纯路由：适用范围、按任务加载的参考表、跨 skill 协作关系；不堆正文。
- `.agents/rules/*.md` — 协作规则（Claude Code rules 语义，可选 YAML frontmatter 门控：`alwaysApply`/`paths`）：由宿主机制注入、不依赖模型判断的强制约定；与 skills 的分工是"rules 机制注入、skills 模型按任务加载"。
- `.agents/<target>/` — 各 CLI 工具的专属资源（`dsh/`、`claude/`、`opencode/` …，随内容建立）：凡依赖特定工具机制的进对应 target 目录；工具无关的留在顶层 `rules/`、`skills/`。安装器按 target 目录映射到各工具。当前为空——DSH 侧能力（skills provider、rules 注入）已并入包根插件（`src/plugin/`），不再依赖 target 目录。
- `docs/` — 本仓库自身文档（单服务形态，遵循 `yx-docs` 布局）：`usage/`、`tech/`、`standards/`、`releases/`、`glossary.md`、`AUTHORING.md`。
- `.agents/notes/` — 决策记录（`{生命周期}/{class}/yyyy-mm-dd-主题.md`，规范见 `yx-docs` skill 的 notes 参考）。
- `.agents/skills/<name>/references/` — 正文细则，按主题拆文件；每行路由条目只对应一个主题。
- `.agents/skills/<name>/references/common/` — 跨语言原则（架构原则、可读性/简洁设计等）；语言专属细则放 `references/<lang>/`。
- `docs/USAGE.md`、`AUTHORING.md` — 使用与编写规范，修订 skill 结构时同步更新（USAGE 已拆为 `docs/usage/`，编写规范在 `docs/standards/skill-authoring.md`）。

## 内容编写规则

1. **规则优先级用 RFC 2119**：MUST/MUST NOT/SHOULD/MAY，并在 SKILL.md 声明语义；SHOULD 偏离需说明原因。
2. **条件加载，反对全量**：正文按任务拆文件；SKILL.md 明确"多主题任务取并集，不默认全部加载"，交叉引用是条件导航不是递归加载指令。
3. **单一权威定义**：同一规则只在一处定义（可声明"统一定义"节），其他文件只留指针；避免多文档重复表述导致漂移。
4. **诚实标注成熟度与来源**：不冒充外部规范原文（如阿里巴巴 P3C）；未验证的能力不宣称已验证；语言覆盖度分级声明（完整/基础指南）。
5. **团队约定与外部规范区分**：团队自定义规则（如 3 参数上限）明确标注为团队共识/强烈建议，不伪装成行业规范。
6. **技术条款要求准确**：写框架行为（事务代理、乐观锁插件、绑定语义等）前核对实际版本行为，宁可写"按所用版本核实"也不写死可能过时的断言。
7. **中文为主**：正文使用中文；代码示例、专有名词保留英文。

## 变更流程

- 修改前先读目标 skill 的 SKILL.md 路由，确认改动落在正确的文件；发现规则重复时收敛到权威定义处，不在第二处补丁。
- 结构调整（移动/改名文件）必须同步更新所有引用链接，并检查无外部仓库指向旧路径。
- 每次改动遵循 `.agents/rules/git-workflow.md` 的提交信息格式；不混合多个主题的重构。
- skill 内容的取舍争议（如规则强度）优先依据既有文档的声明（团队共识/SHOULD 语义），其次询问用户。

## 安装映射

唯一权威是 [src/cli/targets/registry.ts](src/cli/targets/registry.ts)（CLI 安装器读取它）；本节与其保持一致但不重复细节。**DSH 单一内容通道 = kit 整体插件**（包根插件，skills 与 rules 两个独立开关的组件行）：用户级 `install dsh` 仅确保插件已装（`dsh plugin add`）；项目级 `install dsh <path>` 额外把 kit 落位到目标项目 `.agents/`，项目内容以更高优先级覆盖插件（skills rank 200 > 600，rules 同名文件项目侧胜出）。**Claude Code 双通道**：① 插件市场——本仓库即单插件市场（`.claude-plugin/{plugin,marketplace}.json`，插件 source 为仓库根、`skills` 指向 `.agents/skills/`），仅分发 skills（插件组件无 rules 形态），发版时 MUST 同步 bump `plugin.json` 的 `version`；② CLI 映射——用户级 skills 软链 `~/.claude/skills/`、rules 复制当前项目 `.claude/rules/`；项目级（带路径）kit 落位 `.agents/` 后 `.claude/{skills,rules}` 相对软链指向它。两条 skills 通道二选一（双装即双源）。项目级下 skill 间的相对路径引用（如 `../yx-docs/...`）依赖全套 skill 在位，MUST NOT 只安装部分 skill。新增目标工具时先核实其实际目录约定再在 registry 登记，不凭印象写路径。

# 安装

> 受众：使用本 kit 的开发者 ｜ 范围：把 skills/rules/插件安装到各 agent CLI ｜ 最后核实：2026-11-19

## 推荐：yak CLI

发布后（未发布前用仓库直跑，见下节）：

```bash
npx @leiax00/yushe-agent-kit install dsh        # 安装到 DSH
npx @leiax00/yushe-agent-kit install claude     # 安装到 Claude Code
npx @leiax00/yushe-agent-kit install --all      # 所有已核实目标
npx @leiax00/yushe-agent-kit doctor             # 诊断：遮蔽、双源、失效软链、命名不一致
npx @leiax00/yushe-agent-kit list               # 资源与映射清单
```

安装模式：
1. **默认用户级**（dsh skills 软链到用户 skills 根；claude skills 软链到 `~/.claude/skills/`、rules 复制到当前目录 `.claude/rules/`），装一次对全部项目生效；
2. **项目级**用 `install <target> <path>`（`.` 或绝对/相对路径，等价 `--project`）
   1. kit 全量复制到该项目 `.agents/`（随 git 走、团队同版本），Claude Code 在 `.claude/skills/`、`.claude/rules/` 建相对软链指向 `.agents/` 对应内容
   2. DSH 直接读 `.agents/skills/` 与 `.agents/rules/`。`--copy` 强制复制替代软链；工具目录下的实体内容判 conflict 不覆盖；重复 install 幂等。
   3. 项目级是整体安装（skill 相对路径引用依赖全套在位），不提供部分安装。

## 开发期（仓库直跑）

```bash
npm install
npm run dev -- install dsh --no-plugin    # tsx 直跑源码
npm run build && node dist/bin/yak.js …   # 构建产物
```

DSH 插件安装是 `dsh plugin add link:<kit>/.agents/dsh/plugins/yushe-user-rules` 的 passthrough。

## DSH 整体插件（可选，与 CLI 二选一）

kit 包本身就是一个 DSH 包根插件，一条命令装齐 skills + rules：

```bash
dsh plugin add @leiax00/yushe-agent-kit    # 发布后；开发期 dsh plugin add link:<kit 仓库>
```

行为：

1. skills 以 provider 注册（rank 600），项目 `.agents/skills/`（200）与用户 `~/.dsh/skills`（400）的同名 skill 优先于它；
2. rules 单次注入覆盖两层：项目规则根（`.agents` > `.claude` > `.opencode` > `.cursor`，先到先得）+ 包内 `.agents/rules/` 默认规则，同名文件项目侧胜出。

注意事项：

1. 用 `add` 子命令，MUST NOT 用 `install` 或尾部跟路径参数——注册依赖 bundle 的 reconcile 只在"本次新增的依赖"上生效，依赖已存在时 `add` 也不会补注册，需先 `remove` 再 `add`；
2. 注册后**新开会话**才装载（已开的会话保留启动时的插件状态）；关闭插件则 skills 与 rules 注入一并移除，新会话即失效；
3. 与 yushe-user-rules 插件勿同开（项目规则会被注入两遍）；与 CLI 用户级安装二选一——CLI 检测到 profile 依赖里有本包时自动跳过，doctor 对既有双源告警。

## 未支持的目标

opencode/codex/gemini 的目录约定未核实，CLI 会拒绝安装并说明原因；核实后在 `src/cli/targets/registry.js` 登记映射（该文件是映射的唯一权威）。

## DSH 发现机制与排障

见 [dsh-discovery.md](dsh-discovery.md)。不要同时把 skills 复制到同一项目的 `.dsh/skills/` 与 `.agents/skills/`——`.dsh` 优先级更高，会造成同名双源。

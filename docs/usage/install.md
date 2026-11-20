# 安装

> 受众：使用本 kit 的开发者 ｜ 范围：把 kit 安装到各 agent CLI ｜ 最后核实：2026-11-20

## 三条通道

| 通道 | 命令 | 内容位置 | 适合 |
|---|---|---|---|
| DSH 整体插件 | `dsh plugin add @leiax00/yushe-agent-kit` | 包内（`dist/plugin` 读包内 `.agents/`） | DSH 用户一步装齐、随包升级 |
| Claude Code 插件市场 | `claude plugin install yushe-agent-kit@yushe-agent-kit` | 插件副本（市场刷新随发版更新） | 只要 skills 的 Claude Code 用户 |
| yak CLI | `npx @leiax00/yushe-agent-kit install <target>` | 按目标工具映射 | Claude Code（含 rules）、项目级落位 |

DSH 侧**只有插件一条内容通道**：CLI 的 `install dsh` 也只是确保插件已装（见下）。

## DSH：整体插件

```bash
dsh plugin add @leiax00/yushe-agent-kit    # 发布后；开发期 dsh plugin add link:<kit 仓库>
```

行为：

1. skills 以 provider 注册（rank 600），项目 `.agents/skills/`（200）与用户 `~/.dsh/skills`（400）的同名 skill 优先于它；
2. rules 单次注入覆盖两层：项目规则根（`.agents` > `.claude` > `.opencode` > `.cursor`，先到先得）+ 包内 `.agents/rules/` 默认规则，同名文件项目侧胜出；
3. 一个包装两个组件行：`yushe-agent-kit-skills` 与 `yushe-agent-kit-rules`，分别显示为 **Yushe Agent Kit Skills** 与 **Yushe Agent Kit Rules**，在 Plugin Manager 中各自独立开关；只要 rules 不要 skills = 关掉 skills 行。

注意事项：

1. 用 `add` 子命令，MUST NOT 用 `install` 或尾部跟路径参数——注册 bundle 的 reconcile 只在"本次新增的依赖"上生效，依赖已存在时 `add` 也不会补注册，需先 `remove` 再 `add`；
2. 注册后**新开会话**才装载（已开的会话保留启动时的插件状态）；关闭组件行则对应能力移除，新会话即失效；
3. 历史 `yushe-user-rules` 插件与 rules 组件行勿同开（项目规则会被注入两遍）；该插件已并入本包（`src/plugin/rules-engine/`），不再单独存在；
4. 旧版 CLI 装过的用户级 skills 软链（`~/.dsh/skills/yx-*`）会覆盖插件同名 skill，doctor 会告警建议删除。

## Claude Code：插件市场（仅 skills）

本仓库自身即一个单插件市场（`.claude-plugin/{marketplace,plugin}.json`，插件 source 为仓库根），GitHub 镜像匿名可克隆（2026-11-20 核实）：

```bash
claude plugin marketplace add leiax00/yushe-agent-kit
claude plugin install yushe-agent-kit@yushe-agent-kit
# 新版 Claude Code（≥ v2.1.292）可一步：claude plugin install yushe-agent-kit --marketplace leiax00/yushe-agent-kit
```

行为与边界：

1. `plugin.json` 的 `skills` 指向包内 `.agents/skills/`，全套 8 个整体分发，不可拆分（skill 间相对路径引用依赖全套在位）；
2. **rules 不走此通道**：Claude Code 插件组件没有 rules 形态，需要 rules 时用 yak CLI（用户级 `install claude` 或项目级 `install claude .`）；
3. 与 yak CLI 的 skills 通道**二选一**：同开 = 同名 skill 双源（插件副本 + `~/.claude/skills/` 软链并存），doctor 只诊断 yak 侧现场；
4. 更新：`claude plugin marketplace update yushe-agent-kit` 刷新市场目录，`claude plugin update yushe-agent-kit` 更新插件；本仓库发版时同步 bump `.claude-plugin/plugin.json` 的 `version`（Claude Code 以该字段变化判定用户侧更新，漏 bump 用户停在旧版）；
5. 本机无 claude CLI，`claude plugin validate` 未实跑；两份清单已按 2026-11-20 官方 marketplace/manifest 参考核对，`marketplace.json` 另通过 schemastore 官方 JSON Schema 本地校验。

## yak CLI

发布后（未发布前用仓库直跑，见下节）：

```bash
npx @leiax00/yushe-agent-kit install dsh        # 确保 DSH 整体插件已装（link: 开发期 / 包名发布后）
npx @leiax00/yushe-agent-kit install claude     # Claude Code：skills 软链 ~/.claude/skills + rules 复制 .claude/rules
npx @leiax00/yushe-agent-kit install claude .   # 项目级：kit 全量落位 .agents/，.claude/{skills,rules} 相对软链指向它
npx @leiax00/yushe-agent-kit doctor             # 诊断：遮蔽、双源、失效软链、命名不一致
npx @leiax00/yushe-agent-kit list               # 资源与映射清单
```

安装模式：

1. **默认用户级**（装一次对全部项目生效）：dsh = 确保整体插件已装；claude = skills 软链 + rules 复制；
2. **项目级**用 `install <target> <path>`（`.` 或绝对/相对路径，等价 `--project`）：kit 全量复制到该项目 `.agents/`（随 git 走、团队同版本）——Claude Code 软链 `.claude/{skills,rules}` 指向它；DSH 下项目内容以更高优先级覆盖插件（skills rank 200 > 600，rules 同名文件项目侧胜出）；
3. `--copy` 强制复制替代软链；工具目录下的实体内容判 conflict 不覆盖；重复 install 幂等；项目级是整体安装（skill 相对路径引用依赖全套在位），不提供部分安装。

## 开发期（仓库直跑）

```bash
npm install
npm run dev -- install dsh    # tsx 直跑源码
npm run build && node dist/bin/yak.js …   # 构建产物（dist/plugin 是插件入口，构建后 link 安装生效）
```

## 未支持的目标

opencode/codex/gemini 的目录约定未核实，CLI 会拒绝安装并说明原因；核实后在 `src/cli/targets/registry.ts` 登记映射（该文件是映射的唯一权威）。

## DSH 发现机制与排障

见 [dsh-discovery.md](dsh-discovery.md)。不要同时把 skills 复制到同一项目的 `.dsh/skills/` 与 `.agents/skills/`——`.dsh` 优先级更高，会造成同名双源。

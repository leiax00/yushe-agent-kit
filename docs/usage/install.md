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

安装策略：skills 软链优先（更新源即生效），`--copy` 强制复制；实体目录（用户自有安装）判 conflict 不覆盖；rules 对 Claude Code 复制到项目 `.claude/rules/`（`update <target>` 刷新）。

## 开发期（仓库直跑）

```bash
npm install
npm run dev -- install dsh --no-plugin    # tsx 直跑源码
npm run build && node dist/bin/yak.js …   # 构建产物
```

DSH 插件安装是 `dsh plugin add link:<kit>/.agents/dsh/plugins/yushe-user-rules` 的 passthrough。

## 未支持的目标

opencode/codex/gemini 的目录约定未核实，CLI 会拒绝安装并说明原因；核实后在 `src/cli/targets/registry.js` 登记映射（该文件是映射的唯一权威）。

## DSH 发现机制与排障

见 [dsh-discovery.md](dsh-discovery.md)。不要同时把 skills 复制到同一项目的 `.dsh/skills/` 与 `.agents/skills/`——`.dsh` 优先级更高，会造成同名双源。

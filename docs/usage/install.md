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

安装模型：kit **按整体安装**到目标项目 `.agents/`（skills、rules 全量复制，随项目 git 走、团队同版本）；各工具目录由映射产生——Claude Code 在项目 `.claude/skills/`、`.claude/rules/` 建相对软链指向 `.agents/` 对应内容（项目可整体移动），DSH 直接读项目 `.agents/skills/` 与 `.agents/rules/`。工具目录下的实体文件/目录（用户自有内容）判 conflict 不覆盖；`--copy` 强制用复制替代软链；重复 install 幂等（stage 刷新、链接 kept）。skill 间的相对路径引用依赖全套 skill 在位，不提供部分安装。

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

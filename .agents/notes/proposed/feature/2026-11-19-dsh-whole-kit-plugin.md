# DSH 整体插件：一个包装齐 skills + rules

## 背景与问题

kit 此前对 DSH 的安装要走 CLI：skills 软链到用户 skills 根 + 单独安装 yushe-user-rules 插件注入 rules。两步、两处，且"插件能否携带 skills"长期存疑。

调研结论（2026-11-19，依据 DSH 源码 `packages/skill/skill-filesystem`、`packages/skill/skill-office` 及 dsh-blender 插件）：

1. `ctx.skills` 是 provider registry，插件可实现自己的 SkillProvider（skill-office 即官方参考实现）；
2. 插件包可通过 `package.json` 的 `dsh.bundle.patch` 声明 bundle 层，包根插件成立；
3. npm 包的 `files` 可携带内容目录，插件代码从 `packageDir` 直接读取，无需构建期同步。

## 决策

单包整体插件，不拆多包、不建 workspace：

- kit 包根即插件（`main` → `dist/plugin/index.js`，`cordis.patch.yml` 声明行）；
- skills 以 provider 注册，rank 取 600（bundled 同级），使项目（200）与用户级（400）同名 skill 可覆盖 kit 副本——覆盖优先级与文件系统发现顺序一致；
- rules 复用 yushe-user-rules 的注入引擎（重构导出 `makeRuleInjector`/`scanRules`/`scanRulesDir`），单注入器覆盖两层：项目规则根先到先得 + 包内默认规则，同名文件项目侧胜出；
- 零运行时依赖（link: 安装不装依赖）；
- CLI 与插件是同一内容的两个分发通道，DSH 上二选一：CLI 检测 profile 依赖含本包时跳过用户级安装，doctor 对既有双源告警。

## 放弃的替代方案

- 拆 `apps/dsh-plugin` 独立包 + pnpm workspace：版本对齐问题大于收益，单包内插件入口即可（曾试 `apps/cli` 目录化，因单包无多制品回退）。
- 插件只注 skills、rules 维持双插件：用户要的"一步装齐"落空，且双插件同开会把项目规则注入两遍。

## 后果与验证

- 待发布验证：`dsh plugin add @leiax00/yushe-agent-kit` 真实安装路径（本机仅以假 ctx 冒烟：6 个 skill 候选、rank 600、get 内容正确、注入器挂载 agent/pre-step + tools/result）。
- yushe-user-rules 与整体插件勿同开（项目规则双注入），文档已注明。
- 后续若出 Claude 市场插件等第二制品，再评估 workspace 化。

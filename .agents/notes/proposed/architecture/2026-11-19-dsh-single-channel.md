# DSH 分发收敛为 kit 整体插件单一通道

## 背景与问题

kit 对 DSH 曾有三个规则/skills 表面：standalone `yushe-user-rules` 插件（仅 link: 可装，从未发布 npm）、CLI 用户级 skills 软链 + link: 装 yushe-user-rules、kit 整体插件。yushe-user-rules 作为"独立插件"没有独立分发渠道，名存实亡；CLI 与插件双通道带来双源防护成本。

组件行（skills/rules 独立开关，见 [2026-11-19 DSH 整体插件](../implemented/feature/2026-11-19-dsh-whole-kit-plugin.md)）落地后，"只要 rules"可以靠关掉 skills 行实现，独立插件失去最后的存在理由。

## 决策

1. rules 注入引擎（scan/engine/render/frontmatter/glob）转为 TS 并入包内 `src/plugin/rules-engine/`，随 dist 发布；kit 插件自包含，不再引用 `.agents/dsh/`。
2. `.agents/dsh/plugins/yushe-user-rules/` 退役删除；`.agents/<target>/` 目录约定保留（当前为空）。
3. DSH 单一内容通道 = kit 整体插件：CLI `install dsh` 仅确保插件已装（检测 profile 依赖，已装则跳过；未装执行 `dsh plugin add link:<kit>`）；项目级 `install dsh <path>` 额外落位 `.agents/`，项目内容以更高优先级覆盖插件（skills rank 200 > 600，rules 同名文件项目侧胜出）。
4. "单独要 rules" = 关闭 skills 组件行；将来需要 rules-only 轻插件时从同一引擎再包一层。

## 放弃的替代方案

- 保留 yushe-user-rules 独立插件：无 npm 分发渠道，`dsh plugin add` 装不了，仅 kit 检出者可用。
- CLI 用户级继续软链 skills：与插件双源，rank 400 覆盖插件 600 后用户拿到的是检出内容而非包内容，语义混乱。

## 后果与验证

- 已验证（2026-11-19）：插件三态冒烟（skills/rules/全开）、引擎 scanRules/scanRulesDir 直连、隔离环境 CLI install（无 dsh 时给手动指引、插件在场跳过、双源 doctor 告警）、真实 profile install 幂等 + doctor 干净、tsc。
- 用户重载 profile 后需在 Plugin Manager 确认两组件行开关可用（UI 交互未验证）。
- 历史 `yushe-user-rules` 安装残留（如 `~/.dsh/plugins/yushe-user-rules` 软链、profile bundles 里的旧条目）需使用者自行移除，doctor 双源告警兜底。

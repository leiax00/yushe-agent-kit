# 版本决策

版本号依据实际变化清单判定，不是"感觉改了很多"；多包仓库先判定版本策略，再按 semver 定级，0.x 阶段有专门约定。

## 版本策略判定（多包仓库先于 semver）

单包仓库跳过本节。多包 monorepo 先确认版本策略，依据按序：

1. 仓库既有发布规范（最优先，高于本 skill）。
2. 工具暗示：`.changeset/config.json` 的 `fixed`/`linked` 分组；lerna `--independent`；Maven 单 reactor（默认统一）；Go 多模块（天然独立）。
3. 无任何暗示时与用户确认，不擅自假定。

两种策略下的判定规则：

- **统一版本（lockstep）**：semver 级别取全部包变化的**并集**——任一包有 breaking，仓库整体升 major；一个版本号、一次发版。
- **独立版本（independent）**：按包分别判定 semver 与版本号；一次"发版"是发布一批包，各自定级、各自记录。

社区实践参考：发布库的 monorepo 主流是独立版本（changesets 默认，可配 fixed 分组混用），lockstep 代表是 Angular / Babel / Vue 生态；应用 / 服务型 monorepo 主流统一版本（整体部署一个 tag 追踪），微服务独立部署的单仓按服务打版本。

## 判定规则

| 级别 | 触发特征（unreleased 里的变化） |
|---|---|
| PATCH | 缺陷修复、文档修正、不改变任何对外契约的小调整 |
| MINOR | 向后兼容的新能力：新 skill、新 CLI 命令、新配置项、新安装目标 |
| MAJOR | 破坏兼容：CLI 参数语义变更、目录/安装约定变更、默认行为反转、移除公开能力 |

判定顺序：先找有没有破坏兼容的变化（有 → MAJOR 议题），再找有没有新能力（有 → MINOR），否则 PATCH。

## 0.x 阶段约定

- semver 对 `0.x` 的兼容承诺本就宽松：**功能性变化 MAY 进 `0.x.PATCH`/`0.MINOR.x`**，不必为每个新能力升 MINOR；
- 但破坏性变化 SHOULD 在发版记录中显式标注 **breaking**，并优先用 minor 位承载（`0.1.x → 0.2.0`）而不是悄悄 patch；
- 1.0 的时机是产品判断（API 稳定承诺），不是变化量累计。

## 边界

- MAJOR/MINOR/PATCH 拿不准时，把变化归类列给用户定，不替用户拍板。
- 版本号只在这一个地方定义语义；发版记录、tag、package.json 里出现的版本必须同源（见[发布操作](publish.md)）。

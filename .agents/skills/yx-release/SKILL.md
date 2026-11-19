---
name: yx-release
description: 仓库发版流程：确定 semver 版本号、按技术栈落位版本（Node/npm、Java/Maven、Python、Go 各有参考）、迁移发版记录（unreleased → vx.y.z）、打 tag、按渠道发布。用于用户说"发版 / 发一个版本 / 发布 npm 包 / 发布 PyPI 包"或迭代收尾决定发版时加载；发版记录的写法与布局由 yx-docs 承载。
---

# 发版

发版是**仓库级动作**：在 main 上聚合 `releases/unreleased.md` 的变化，确定版本并发布；它发生在任务合入之后，不依附单个任务分支。本 skill 默认面向单版本线仓库（一份 unreleased、一个版本号）；多版本线 monorepo 先经[版本决策](references/version.md)的策略判定确定版本策略与本次要发的线。

## 流程路由

| 步骤 | 何时读 | 参考 |
|---|---|---|
| 版本决策 | unreleased 变化在手，需要定 MAJOR/MINOR/PATCH | [版本决策](references/version.md) |
| 发布操作 | 版本已定，执行记录迁移、落位、tag 与渠道发布 | [发布操作](references/publish.md) |

## 技术栈适配（按需加载一个）

版本号载体、统一升版命令与发布渠道因技术栈而异。执行**版本落位**与**渠道发布**前，按仓库特征加载对应参考：

| 仓库特征 | 参考 | 覆盖 |
|---|---|---|
| 含 `package.json` | [Node/npm](references/node-npm.md) | 版本探测、`npm version` 与 lock 同步、workspaces 策略、`npm publish` |
| 含 `pom.xml` 或 Maven wrapper | [Java/Maven](references/java-maven.md) | 多模块探测、`versions:set` 统一升版、SNAPSHOT 约定、`mvn deploy` |
| 含 `pyproject.toml` | [Python](references/python.md) | `__version__`/pyproject 双事实来源、uv/hatch 升版与发布 |
| 含 `go.mod`（Go module） | [Go](references/go.md) | 无版本文件、tag 即版本、`/vN` 模块路径、多模块 tag 前缀 |

多技术栈混合仓库（如 Maven＋npm）加载各自参考，版本事实来源与同步顺序先确认再动手。**仓库自身有发布流程规范时以其为准，优先级高于本 skill 参考**；未覆盖的工具（Gradle、Cargo 等）核实其实际约定后按同一模式补充参考文件，不放占位。

## 通用边界

- 发版记录的布局与写法以 **yx-docs skill** 的发版参考为权威，本 skill 只引用；`unreleased → 版本文件` 的迁移是操作，格式细节不在此重复。
- tag、推送、渠道发布（npm publish / mvn deploy / uv publish 等）都 MUST 用户显式授权（提交授权分级见宿主 git 工作流规则），发版指令不隐含任何一步。
- 跨 skill 协作：**yx-task-wrapup** 的迭代收尾做"是否发版"评估后触发本 skill；**yx-docs** 提供记录格式权威。

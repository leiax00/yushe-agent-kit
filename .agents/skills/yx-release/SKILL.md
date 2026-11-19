---
name: yx-release
description: 仓库发版流程：确定 semver 版本号、迁移发版记录（unreleased → vx.y.z）、更新 package.json 版本、打 tag、按渠道发布（npm 等）。用于用户说"发版 / 发一个版本 / 发布 npm 包"或迭代收尾决定发版时加载；发版记录的写法与布局由 yx-docs 承载。
---

# 发版

发版是**仓库级动作**：在 main 上聚合 `releases/unreleased.md` 的变化，确定版本并发布；它发生在任务合入之后，不依附单个任务分支。

## 流程路由

| 步骤 | 何时读 | 参考 |
|---|---|---|
| 版本决策 | unreleased 变化在手，需要定 MAJOR/MINOR/PATCH | [版本决策](references/version.md) |
| 发布操作 | 版本已定，执行记录迁移、tag 与渠道发布 | [发布操作](references/publish.md) |

单文件小仓库默认按顺序一次走完两步；多包仓库（monorepo）先确认各包是否同版本节奏，再逐包执行。

## 通用边界

- 发版记录的布局与写法以 **yx-docs skill** 的发版参考为权威，本 skill 只引用；`unreleased → 版本文件` 的迁移是操作，格式细节不在此重复。
- tag、推送、npm publish 都 MUST 用户显式授权（提交授权分级见宿主 git 工作流规则），发版指令不隐含任何一步。
- 跨 skill 协作：**yx-task-wrapup** 的迭代收尾做"是否发版"评估后触发本 skill；**yx-docs** 提供记录格式权威。

# 发布操作

版本已定后的执行清单：前置检查 → 记录迁移 → 版本落位 → 提交 → tag → 渠道发布 → 汇报。以 kit 仓库（单包 + npm 渠道）为基准写，其他仓库按实际渠道裁剪。

## 清单

1. **前置检查**：在 main 上；工作区干净；与远端同步（领先时先推送、落后时先 `git pull --ff-only`）；构建通过。
2. **记录迁移**：`docs/releases/unreleased.md` 的内容迁入 `docs/releases/vX.Y.Z.md`（含日期与版本标题；格式权威在 yx-docs 发版参考）；unreleased.md 重置为空模板，下个版本继续累积。
3. **版本落位**：`package.json` 的 `version` 改为目标版本；`npm pack --dry-run` 核对 `files` 清单与实际载荷一致（新增的目录/资源类型漏登记在这里暴露）。
4. **提交**：版本号 + 记录迁移一个提交：`chore(release): 发布 vX.Y.Z`（直提 main 的一主题提交，按 git 工作流规则逐次确认）。
5. **推送与 tag**：提交推送、`git tag vX.Y.Z` 及 tag 推送均 MUST 用户显式授权，逐项执行不打包；tag 名与记录文件名、package.json 版本三者同源。
6. **渠道发布**：npm 渠道 `npm publish`（`prepublishOnly` 已挂钩构建则不重复跑）；灰度场景用 `--tag next` 等 dist-tag；发布后 `npm view <pkg>` 验证版本与 tarball 就位。
7. **汇报**：版本号、tag、发布渠道与验证结果；漏发/失败如实报告并给出补救路径（如 `npm deprecate`、补发 patch），不粉饰。

## 边界

- 发版不引入分支：全部动作发生在 main；发版中途失败（如 publish 网络错误）时记录做到哪一步，重试从断点继续，不重复已成功的步骤。
- 多包仓库：各包独立执行 2–6，共享同一发版日期；包间依赖版本引用在各自 `package.json` 中同步。

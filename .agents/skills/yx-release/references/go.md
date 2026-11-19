# Go 适配

Go module 的特殊性：**没有版本文件，tag 即版本**——通用清单里的"版本落位"与"打 tag"在本参考下是同一步，不重复执行。

## 版本号探测

- 模块版本 = git tag（`vX.Y.Z`，`v` 前缀必须）；现有 tag 列表 `git tag -l`。
- `go.mod` 的 module 行决定主版本约束：**major ≥ 2 时模块路径 MUST 带 `/vN` 后缀**（如 `module github.com/user/repo/v2`）；升 major 前先改模块路径并全仓更新 import，否则 tag 推上去消费方拉不到新版本。

## "升版"操作

- 单模块仓库：`git tag vX.Y.Z` 就是版本落位本身。
- 多模块单仓：tag 带模块目录前缀，如 `repo/submod/v1.2.3`，只标要发布的模块。
- tag 打错不能改推覆盖：Go module proxy（如 proxy.golang.org）一旦缓存即不可撤回，只能移除错误 tag 后发新 patch。

## 渠道发布

- 发布 = 推 tag：`git push origin vX.Y.Z`（需用户显式授权，与通用清单一致）。
- 公共模块由 proxy.golang.org / sumdb 自动拉取缓存，无额外上传动作；私有模块按仓库 `GOPRIVATE` 约定跳过代理。
- 发布后 `go list -m <module>@vX.Y.Z` 或 pkg.go.dev 核验。

## 边界

- 语义化版本对 Go 的额外含义：`v0.x` 视为不稳定、`v1` 不带后缀；major 迁移是 breaking 的完整流程（改路径 + 改 import + 升 tag），不建议与其他变更混在一次发布里。

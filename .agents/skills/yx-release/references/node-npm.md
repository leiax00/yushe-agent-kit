# Node / npm 适配

## 版本号探测

- 单包：`package.json` 的 `version` 字段。
- workspaces / monorepo：先确认是统一版本（所有包同号）还是各包独立版本；统一版本以根 `package.json` 为事实来源，独立版本逐包探测。
- 无既有约定时先与用户确认版本策略，不擅自假定。

## 统一升版

在目标包目录执行：

```bash
npm version --no-git-tag-version X.Y.Z
```

- **必须带 `--no-git-tag-version`**：npm 默认会自行 commit 并打 tag，抢在发布流程的提交与 tag 步骤之前制造不受控产物。
- 仓库带 Claude Code 插件清单（`.claude-plugin/plugin.json`）时 MUST 同步其 `version`：插件市场以该字段变化判定用户侧更新，漏同步会把用户钉在旧版。
- `package-lock.json` 顶层版本随命令联动更新，一并提交；pnpm-lock.yaml 不含自身版本号，无需同步。
- monorepo 逐包执行，或用仓库既有编排工具统一管理。
- 仓库已采用 **changesets**（存在 `.changeset/` 目录）时 MUST 走 `changeset version`，由它消费变更集、改版本并生成 CHANGELOG，不手改。
- 完整性验证：`npm install --package-lock-only` 后确认 lock 与 `package.json` 一致无漂移。

## 渠道发布

- 发布前 `npm pack --dry-run` 核对 `files` 载荷与实际交付一致（新增目录 / 资源类型漏登记在这里暴露）。
- `npm publish`；首次发布 scoped 包确认 `publishConfig.access` 已设为 public；开启 2FA 的账号备好一次性验证码。
- 灰度：`npm publish --tag next`，验证 `npm dist-tag ls <pkg>` 后再考虑把 latest 指过去。
- 发布后 `npm view <pkg> version` 核验；npm 不允许覆盖已发布版本，发错只能发新 patch 或 `npm deprecate` 标记。

## 边界

- 测试 / 构建门禁在发布操作的通用前置检查里执行，本参考只管版本落位与渠道。

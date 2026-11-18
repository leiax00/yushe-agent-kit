# 安装

> 受众：使用本 kit 的开发者 ｜ 范围：把 skills/rules 安装到各 agent CLI ｜ 最后核实：2026-11-18

## DSH（DeepSeek Harness）

本仓库本身就是一个合法的 agent 工作区——把 DSH 会话工作目录设为仓库根即可识别 `.agents/skills/`，无需安装。

全局安装（软链，更新源即生效）：

```bash
ln -s /path/to/yushe-agent-kit/.agents/skills/yx-backend-architecture ~/.dsh/skills/yx-backend-architecture
```

协作规则（`.agents/rules/`）由 DSH 的 `yushe-user-rules` 插件注入（项目根 rules 目录优先），无需手动操作。

## Claude Code

- skills：复制 `.agents/skills/<name>/` 到 `~/.claude/skills/<name>/`
- rules：Claude Code 原生支持 `.agents/rules/` 目录（rules 语义），项目级放置即可

## OpenCode / Codex 等

安装器开发中（`npx yushe-agent-kit install <target>`，映射 `.agents/` 到各工具目录）。当前可手动复制到各工具的 skills 目录约定位置。

## 注意

- 不要同时把 skills 复制到同一项目的 `.dsh/skills/` 与 `.agents/skills/`——`.dsh` 优先级更高，会造成同名双源。

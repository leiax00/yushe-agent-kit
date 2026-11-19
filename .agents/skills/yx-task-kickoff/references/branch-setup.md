# 开分支与 worktree（通用操作流程）

各类型任务开分支时的统一操作流程：收集 git 现场 → 一次性问全决策 → 创建 → 汇报。分支命名遵循目标项目注入的 git 规则（kit 仓库为 `feat/`、`fix/`、`try/` 前缀）；无注入规则时用 `feature/`、`fix/` 等与 commit type 语义一致的前缀，英文小写 kebab-case，不超过 5 个词，有关联 issue 号附末尾。

## 基本模型（vibe coding 场景）

1. **本地分支是 agent 的自由沙箱**：一任务一分支，分支上允许 checkpoint 式提交（不要求每次提交都可用）；可用性门禁放在合入前，不在每次提交。
2. **worktree 只解决同一台机器上的并行**：团队隔离靠"不推送 remote 即私有"（每人各自开发机），不需要 worktree。worktree 是本机并行的开关，不是默认。
3. **分支短命**：任务完成即合入（SHOULD 当天量级），merge 后删除分支与 worktree；跑偏不合入的注明原因后删除，main 零污染。

## 第 0 步：收集信息

- 当前分支 `git branch --show-current`；worktree 情况 `git worktree list`；工作区状态 `git status --short`。
- 有未提交改动不阻塞（`git switch -c` 会带着改动一起走），但要告知用户。
- **并行信号判断**：出现以下任一情况时，worktree 从"不推荐"变为"推荐"——
  - 当前分支上存在另一个未完成任务，而新任务不从它切出；
  - 用户明确表示要并行/同时做多个任务；
  - 已有其他 worktree 承载进行中任务，本次是追加任务。
- 重名检查：`git branch --all --list '*<关键词>*'`；撞名时调整名字。

## 第 1 步：一次性问全决策

向用户确认三件事（宿主有选项提问工具时一次问全）：

1. **分支名**：自动推荐的名字放第一个并标推荐，再给 1–2 个备选。
2. **是否创建分支**：默认创建；用户选不创建则留在当前分支。
3. **是否创建 worktree**：**按并行信号定默认**——无并行信号时默认不新增（串行场景：单 checkout 换分支即可）；有并行信号时推荐新增，并说明理由。worktree 必然伴随新分支（不创建分支时本项自动失效）。

当前分支已是功能分支时，说明基点将是其 HEAD；用户想从 main 切出时先 `git switch main`。

## 第 2 步：创建

仅新分支（基点为当前 HEAD；在常驻分支上时先 `git fetch origin`，落后则 `git pull --ff-only`，分叉即停止报告；fetch 失败按已知状态继续并在推送前重核）：

```bash
git switch -c <分支名>
```

新分支 + worktree（路径按仓库惯例放同级目录）：

```bash
git worktree add ../<任务名> -b <分支名>
```

- 会话切换优先用宿主的 worktree 进入工具（如 DSH 的 create_worktree）；不可用时把路径告知用户，由用户决定切换方式。
- 绝不使用 bare `git stash` / `git stash pop`（worktree 间共享 stash 栈）。
- worktree 是一次性资源：每个 worktree 配独立的端口/`.env`（如 `PORT=3xxx`）防并行互撞；合入后立即删除并 `git worktree prune`。

## 收尾汇报

报告分支名、基点短 hash、是否 worktree 及路径、未提交改动去向（如有）；提醒完成后走对应类型的收尾/合入流程。

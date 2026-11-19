# 清理分支与 worktree（共享操作）

正常完成与中止共用的清理操作流程，对应 kickoff「开分支与 worktree」的收尾侧；场景决策（删还是留）见各场景参考，本文件只写操作。

## 操作清单

1. **回到 main**：`git switch main`；确认 `git status --short` 干净，没有带着未提交改动做清理。
2. **删分支**：
   - 已合入分支：`git branch -d <分支>`（`-d` 自带"未合入则拒绝"的保护，优先用它）；
   - 不合入分支：`git branch -D <分支>`，执行前确认已按[中止与不合入](abort.md)完成定性——`-D` 会丢掉未合入的工作。
3. **删 worktree**：`git worktree remove ../<任务名>`，然后 `git worktree prune`；worktree 是一次性资源，合入或中止后立即删除，不保留"以防万一"。
4. **远端留痕**：分支曾推送过则远端仍在；删除远端分支 MUST 用户明确要求才执行。
5. **复核**：`git worktree list`、`git branch`、`git status --short --branch` 三项确认——无残留 worktree、无残留任务分支、main 与远端的领先/落后笔数符合预期。

## 边界

- 不使用 bare `git stash` / `git stash pop` 清理工作区（worktree 间共享 stash 栈，与 kickoff 侧同一禁令）。
- 清理产生的问题（误删、prune 后目录残留）立即报告，不静默恢复重建。

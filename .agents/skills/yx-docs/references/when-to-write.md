# 何时写文档

写文档的触发时机对照表：事件发生时按表执行，不在表中事件不强制写。具体格式见 writing-guide.md / module-docs.md / notes.md / releases.md。

## 事件 → 动作对照

| 事件 | 要写的文档 |
|---|---|
| 开特性分支、开始一次变更 | 开 `proposed/` note（背景/方案/替代方案/验收，**动手前**写） |
| 实现中方案调整、发现新约束 | 更新对应 note 的内容 |
| 合入代码 | ① note 移入 `implemented/`（事实同步）② 模块机制实质变化 → 该模块 `history.md` 追加一条 ③ 对外可感知 → `releases/unreleased.md` 条目 ④ 模块机制变化 → `design.md` 机制描述同步更新 |
| 接口增删改废 | 更新本服务 `apis/` 的 spec；破坏性变更同步 unreleased 条目与迁移要点 |
| 出现跨模块使用的新术语 | `glossary.md` 加词条（模块内部概念进模块 design.md，不进 glossary） |
| 做了技术选型/架构决策 | 开 note 记录论证；落地后 `tech/stack.md` 综述表更新并链接 note |
| 产品功能定义或边界变化 | 更新 `product/definition.md` 功能地图（含负面清单）；迭代模式下调期结束时更新 |
| 新建功能模块 | 建模块目录：README + design.md + history.md（首条记录初始设计） |
| 新建服务/可发布单元 | 建 `docs/services/<name>/` 骨架；根 README 仓库地图加一行；`docs/tech/` 架构文档加组件 |
| 发版 | 按 releases.md 的汇集流程定稿（读 unreleased → git log → history → notes → spec 校验） |
| 移动/重命名文档 | 同步更新所有引用链接（规则已强制） |
| 发现文档与代码冲突 | 以代码为准，同一变更修正文档；无法立即核实的标注"待核实" |
| 做时间盒排期与回顾（若采用迭代） | `iterations/<编号>/` 的 plan.md / review.md |

## 什么时候不写

- **不预建空结构**：没有内容的目录/文件不创建（空的 usage/、只有一个词条的 glossary 都等有实料再建）。
- **内部重构、无对外感知的变化**不写 unreleased 条目——git history 已记录；模块机制有实质变化才写 history.md。
- **临时性内容不落库**：会话过程、调试笔记、TODO 清单、进度汇报不属于文档。
- **不重复记录**：该记在代码注释/git message 里的不搬进文档；表内未触发的事件不"顺手"写。
- **不确定受众的文档不写**：说不出谁在何时会读，就先不写。

## 原则

文档与变更**同生**（同一提交/同一合入完成），不发版后补写——补写的文档必然失真。审查一次变更时，上表命中的动作未完成视为变更未完成。

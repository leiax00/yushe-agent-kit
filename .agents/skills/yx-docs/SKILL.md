---
name: yx-docs
description: 项目文档的读取与写作：分形布局约定（单服务/monorepo/功能模块）、产品/技术/使用文档、实现原理文档、决策记录（.agents/notes）、发版记录（docs/releases/）。用于查找文档、编写或整理各类文档时加载。
---

# 文档体系

统一原则（MUST，贯穿所有层级）：

1. **路由不堆正文**：每个 README 是索引表，不是内容堆场。
2. **就近放置**：文档放在关注点所及的最小范围；跨模块内容上移一层。
3. **单一权威定义**：同一事实只在一处定义，其他位置留链接。
4. **四层记录分工**：git history 记事实、docs/releases/ 记版本对外变化、模块 history.md 记机制演进、notes 记决策理由；不相互重复。

## 按任务加载

| 任务 | 参考 |
|---|---|
| 确定某事件发生后要写哪些文档 | [何时写文档](references/when-to-write.md) |
| 在项目中查找/理解文档 | [读取协议](references/reading-protocol.md) |
| 新建或调整仓库/服务/模块的文档结构 | [布局约定](references/layout.md) |
| 编写模块文档（实现原理、使用方法） | [模块文档指南](references/module-docs.md) |
| 编写其他任意类型文档（usage/product/tech/术语/标准/索引） | [写作指南](references/writing-guide.md) |
| 记录一个设计决策或提案 | [决策记录](references/notes.md) |
| 记录版本变更或发版 | [发版记录](references/releases.md) |

多主题任务取并集，不默认全部加载。

## 边界

- 放置位置、链接同步、语言风格等强制底线由 `.agents/rules/docs-management.md` 注入，本 Skill 不重复定义。
- 接口契约文档以 `yx-api-design` 维护的契约源为准，文档只是视图。

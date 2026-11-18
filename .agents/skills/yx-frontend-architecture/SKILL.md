---
name: frontend-architecture
description: 设计、实现或评审前端业务模块、组件边界、状态、表单和异步交互；适用于 React/Vue 与 TypeScript 项目，接口契约和数据库设计由对应 Skill 负责。
---

# 前端架构

先检查项目规则、package.json、路由、组件库、状态与请求工具和同类页面。沿用已采用的框架，不为采用本规范引入新的 UI 或状态库。

1. 读取 [模块与数据边界](references/structure.md)，按当前任务选择页面、业务组件和共享组件的边界。
2. 涉及请求、缓存、表单或并发交互时读取 [状态与交互](references/state-and-interaction.md)。
3. 根据实际框架读取 [React/Vue 适配](references/frameworks.md) 中对应部分。
4. 新增或改变接口契约时显式加载 `api-design`；不可用时沿用已存在契约并报告缺失，不假定依赖自动加载。
5. 验证用户可观察的成功、空态、加载、失败和无权限路径；涉及交互时检查键盘操作与焦点。

交付说明修改的用户流程、组件/状态归属、契约变化及验证结果。不要只为目录整齐迁移未涉及页面。

# yx-docs 文档体系的关键取舍

> 状态：implemented ｜ 提出于 2026-11-18

## 背景

需要一个"人和 agent 都阅读友好"的文档体系：通用结构、单服务与 monorepo（可混合多语言）的组织方式、读取方式。参考了 DSH 的 Agent Notes（生命周期编码进路径、替代检查、拒绝中心索引）。

## 决策

1. **分形结构**：仓库 → 服务 → 模块同一套规则递归；monorepo 只设一个根 `docs/`，服务维度在 `docs/services/<service>/` 内体现（目录名与代码单元名一致，靠命名对应）。
2. **模块文档以实现原理为核心**：`docs/modules/<m>/{README,usage,design,history}.md`；README 只做路由（≤30 行）。
3. **不做路径映射**：模块 README 只写主要入口（类/接口名）与依赖领域（模块名）；文件路径映射维护成本远超收益，git history 才是路径事实权威。
4. **四层记录分工**：git history（事实）→ releases/（版本，一版一文件，unreleased 累积）→ 模块 history.md（机制演进，只追加）→ notes（决策理由）。
5. **API 契约归服务所有**：OpenAPI YAML 是契约源（非 md），放 `docs/services/<s>/apis/`；跨服务只放索引表，聚合视图生成不手维护。
6. **何时写有明确对照表**（when-to-write.md）：事件 → 动作；含"不写清单"（不预建空结构、无感知不写、临时内容不落库）；文档与变更同生，未完成视为变更未完成。

## 放弃的替代方案

- 包目录内放 README+docs（Java 可行但非普遍保证：Python 打包、Go 构建对源码目录杂散文件态度不一）→ 收敛为服务级 modules/。
- CHANGELOG.md 单文件滚动追加 → 一版一文件的 releases/ 目录（版本天然独立、可链接、无关变更不冲突）。
- 每单元（服务）自带 docs/ → 单一根 docs/ + services/ 层（一个入口、一个心智模型，agent 检索更可靠）。
- 迭代（iterations/）作为必备层 → 降为可选；细粒度快速迭代用 notes（一分支一记录）承载。

## 后果

- `yx-docs` skill 共 7 个 references：when-to-write / layout / reading-protocol / writing-guide / module-docs / notes / releases。
- `docs-management` 规则瘦身为底线 + 指向 skill（消除双源）。
- 本仓库自身文档按此体系重组（见 docs/tech/architecture.md）。

# 布局约定

分形结构：同一套规则在仓库 → 服务 → 模块每个层级重复。约定工具无关，不绑定包管理器或语言。

## 单服务仓库

```text
repo/
├── README.md            # 路由入口：项目是什么 + docs/ 各目录索引 + 快速上手指引
├── AGENTS.md            # agent 工作区约定（可选，随宿主约定）
├── .agents/
│   ├── rules/           # 强制协作规则（机制注入）
│   └── notes/           # 决策记录（见 notes.md）
└── docs/
    ├── apis/            # 本服务的 OpenAPI 契约源（YAML，见下"API 契约"）
    ├── usage/           # 使用说明书（目录，见下）
    ├── product/         # 产品文档（目录，见下）
    ├── tech/            # 技术文档（目录，见下）
    ├── releases/        # 发版记录：一个版本一个文件（见 releases.md）
    │   ├── unreleased.md    #   未发布变更的累积区
    │   └── v1.2.0.md        #   已定稿的版本记录，冻结不改
    ├── standards/       # 定义的标准：团队内部规范全文（见下）
    ├── references/      # 外部引用资料索引（见下）
    ├── glossary.md      # 名词解释：跨服务术语的唯一权威定义源
    ├── iterations/      # 迭代记录：一个迭代一个目录（见 writing-guide.md 模板）
    ├── AUTHORING.md     # 贡献：怎么改这个仓库
    └── modules/         # 功能模块文档（见 module-docs.md)
```

### docs/ 下的主题目录

每个目录一个主题域，内含多个专题文件；服务 README 的索引表路由到文件级：

- **`usage/`** — 使用说明书，面向使用者/运维：`quickstart.md`（快速上手）、`configuration.md`（配置说明）、`troubleshooting.md`（排障）等，按需增拆。
- **`product/`** — 产品文档，面向产品视角：产品定义说明、功能说明、设计稿。设计稿等二进制资源不入 docs/，product/ 内放**索引页**（链接到 Figma/资产库/`assets/`），关键信息 MUST NOT 只存在于图片里——图中承载的结论要用文字在 md 中复述。
- **`tech/`** — 技术文档，面向技术综述：技术栈清单及理由摘要、系统架构说明、部署拓扑。**选型/取舍的完整论证以 `.agents/notes/` 为权威**，tech/ 只作综述视图并链接过去，MUST NOT 双写论证。
- **`standards/`** — 团队定义的标准全文（编码规范、流程规范、质量标准）。与 `.agents/rules/` 分工：rules 是机制注入的强制约束，standards 是供查阅的标准全文；某条标准需要强制执行时提炼成 rule 并链接回全文。
- **`references/`** — 外部引用资料索引：第三方官方文档、规范原文、内部 wiki 等。只做索引页（每条注明覆盖什么、何时该查），MUST NOT 复制外部内容入库——复制即开始腐化；链接失效时标注而非静默替换。
- **`glossary.md`** — 跨服务术语表，术语的唯一权威定义源。模块内部概念仍归模块 design.md 的概念小节，glossary 只收跨模块使用的词并链接到定义处；发现同一词多处解释时收敛到 glossary。

### API 契约（apis/）

后端服务的接口契约用 **OpenAPI YAML** 作为源文件（不是 md），归实现它的服务所有：

1. spec 跟服务走：单服务仓库放 `docs/apis/`，monorepo 放 `docs/services/<service>/apis/`；文件名即服务名（`order-service.yaml`），一个服务多个 API 面（对外/对内）时一面上一个文件。
2. spec 是唯一契约源：文档中所有接口的 md 描述都只是视图，MUST NOT 与 spec 双写；契约细节以 spec 为准（与 `yx-api-design` 的原则一致，契约编写规范也由该 Skill 承载）。
3. 跨服务发现：L0 `docs/tech/` 只放索引表（服务 → spec 路径 → 一句话职责）；需要聚合视图（如网关合并全量 spec）时生成产物，不手工维护。
4. 版本联动：spec 的破坏性变更 MUST 同步记入该服务 `releases/unreleased.md`。

## Monorepo（可混合多语言）

整个仓库**只设一个根 `docs/`**，服务维度在 docs 内部体现为一级 `services/` 目录；代码按角色分组（apps/packages），文档统一入口。

```text
mono/
├── README.md / AGENTS.md    # L0：仓库地图 + 各单元一句话 + 指向 docs/ 索引
├── .agents/notes/           # 全局决策记录
├── docs/                    # ★ 仓库唯一的文档根
│   ├── product/             # 产品级：产品定义、功能地图、设计稿索引（唯一产品定义源）
│   ├── tech/                # 跨服务技术：总体架构、服务间契约视图、技术栈综述
│   ├── standards/           # 团队标准全文
│   ├── references/          # 外部引用资料索引
│   ├── glossary.md          # 跨服务术语表（唯一权威定义源）
│   ├── iterations/          # 迭代记录：一个迭代一个目录（见 writing-guide.md 模板）
│   │   └── 2026-W46/        #   {plan.md, review.md}，结束后冻结
│   ├── services/            # 各服务专属文档，目录名与代码单元名对应
│   │   └── <service>/       #   结构与单服务的 docs/ 相同（分形递归）
│   │       ├── apis/        #   该服务的 OpenAPI 契约源（YAML，见下"API 契约"）
│   │       ├── usage/       #   该服务的运维/配置/排障
│   │       ├── tech/        #   该服务的技术实现
│   │       ├── releases/    #   该服务的发版记录
│   │       └── modules/     #   该服务的功能模块文档
│   └── AUTHORING.md         # 贡献：怎么改这个仓库
├── apps/                    # 可部署单元（前端应用、后端服务），按角色不按语言
│   └── order-service/
└── packages/                # 共享库（组件库、util、SDK）
    └── ui-components/
```

规则：

- **归属跟着描述对象的边界走**：产品级 → `docs/product/`；跨服务技术 → `docs/tech/`；单服务内容 → `docs/services/<service>/` 下细分。
- `docs/services/<service>/` 的内部结构与单服务仓库的 `docs/` 完全一致——同一套分形规则递归，不引入新概念。
- 服务目录名 MUST 与代码单元名（apps/packages 下的目录名）一致，靠命名对应而非路径映射。
- 跨单元契约（如前端调后端的 API）放 `docs/tech/`，以契约源为准。
- 每个可发布单元独立维护自己的 `releases/`（在 `docs/services/<service>/releases/`）；根级 MUST NOT 放汇总——跨单元发版说明按需聚合生成，常驻汇总会让无关变更互相冲突。
- 独立发布的 package（如组件库、SDK）如果文档量大，同样走 `docs/services/<package>/`（目录名与 packages/ 下一致）；量小时先并入 `docs/tech/` 的共享库说明，不预建空结构。

## 模块目录（docs/modules/）

模块是**功能视角**的切分，不要求与代码包一一对应；一个模块可对应一组包、一个域或一个子服务。

```text
docs/modules/<module>/
├── README.md       # 路由：职责、主要入口、依赖领域、指向下列文档
├── usage.md        # 使用方法（外部有消费者时才需要）
├── design.md       # 实现原理（核心文档）
└── history.md      # 实现演进史（见 module-docs.md）
```

- 模块与代码的关联用**主要入口和依赖领域**表达（见 module-docs.md 模板），MUST NOT 维护文件路径映射表——路径级映射维护成本远超收益，且 git history 已是路径事实的权威。
- 模块数量增长后，服务 README 的索引表按域分组呈现。

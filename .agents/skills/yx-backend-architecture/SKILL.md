---
name: yx-backend-architecture
description: 设计、实现或评审后端模块、服务编排与持久化边界；提供 Java/Spring Boot/MyBatis-Plus 架构和编码规范，以及 TypeScript、Python、Go 的基础指南。
---

# 后端架构

## 适用范围

用于后端架构、业务实现、重构和代码评审。Java 规范覆盖较完整；其他语言目前是基础指南，不能宣称具有同等覆盖或验证程度。

## 工作方式与规则优先级

1. 读取适用项目规则、目标代码、依赖与相关测试，确认已有改动和任务范围。
2. 明确任务语言与实际变化，仅加载下面命中的参考文档；纯局部修改不要求重新选择全项目架构。
3. 实现最小完整变化，执行与风险匹配的检查；不自动升级依赖、扩大重构或操作共享环境。

用户明确要求与适用项目规则优先。MUST/MUST NOT 表示必须/禁止；SHOULD 是默认建议，偏离说明原因；MAY 可选。既有契约兼容与新规则冲突时说明具体位置和迁移影响，不静默改变行为。

参考链接用于条件导航，不意味着递归加载全部引用。已读且未改变的内容无需反复读取；任务扩大或发现新风险时再补读。

## Java

### 最小必读

新增、修改或评审 Java 代码，读取 [编码基线](references/java/coding-style.md)。不因修改很小忽略明确的编码要求，也不为遵守架构模板扩写无关代码。

### 按任务加载

每行只负责一个主题；多主题任务取并集，不默认全部加载。

| 任务或变化 | 参考 |
|---|---|
| 新建模块、调整包或架构边界 | [Java 结构](references/java/structure.md) |
| 应用编排、数据访问边界、多仓储、能力分包 | [Repository 与模块](references/java/repositories-and-modules.md) |
| 对象归属、跨层复用、构造器、Builder、Lombok | [数据对象与构建](references/java/data-objects.md) |
| 新增类型、修改可变性/相等性、record/class 转换 | [类型选择](references/java/record-vs-class.md) |
| Java 模块公开接口、DTO 或 api 子包 | [api 组织](references/java/api-layout.md) |
| 跨模块/跨服务调用、入站/出站、事件 | [集成边界](references/java/integrations.md) |
| 枚举、常量、配置、业务错误码 | [所有权与编码](references/java/enums-and-constants.md) |
| Spring 事务、异常映射、客户端装配 | [Spring Boot](references/java/spring-boot.md) |
| SQL、MyBatis-Plus、填充、锁与分页 | [持久化规范](references/java/mybatis-plus.md) |
| 外部请求绑定、PATCH、缺失/null/默认值语义、可信范围（不是所有 DTO 修改） | [输入契约](references/java/input-contracts.md) |
| 日志或审计 | [日志与审计](references/java/logging-and-audit.md) |
| 提炼公共技术模块或 starter | [框架边界](references/java/framework-boundaries.md) |
| 拆方法/类、引入模式、可读性重构 | [简洁设计](references/common/clean-design.md)（跨语言） |
| 选择测试、架构评审、较复杂行为变更 | [验证指南](references/java/verification.md) |

DTO 按实际变化选文档：内部 DTO 的归属或构建看数据对象；新增类型再看类型选择；只有外部输入绑定/语义变化才读输入契约。仅沿用既有类型增改字段，不默认三份全读。Java 具体规则已在专题展开，不默认补读通用原则。

### 验证与交付

运行项目已有的适用检查；小改动检查相关行为，大改动按验证指南选择证据。说明实际执行结果、兼容影响和未验证项，不把规范加载或编译通过视作真实数据库/HTTP 验收。

## TypeScript

成熟度：基础指南。读取 [TypeScript 入口](references/typescript/guide.md)；涉及架构边界时补读 [通用原则](references/common/common.md)，涉及可读性重构、命名或设计模式选择时补读 [简洁设计](references/common/clean-design.md)。按项目实际框架扩展，不能套用 Java 的 Repository 或类继承模板。

## Python

成熟度：基础指南。读取 [Python 入口](references/python/guide.md)；涉及架构边界时补读 [通用原则](references/common/common.md)，涉及可读性重构、命名或设计模式选择时补读 [简洁设计](references/common/clean-design.md)。同步/异步与数据库生命周期按现有技术栈核实。

## Go

成熟度：基础指南。读取 [Go 入口](references/go/guide.md)；涉及架构边界时补读 [通用原则](references/common/common.md)，涉及可读性重构、命名或设计模式选择时补读 [简洁设计](references/common/clean-design.md)。使用 Go 包、消费方接口与显式错误语义，不照搬 Java 分层。

## 跨领域协作

- 改变外部接口契约：显式加载 `yx-api-design`。
- 改变数据模型、索引或迁移：显式加载 `yx-database-design`。
- 前端页面/组件开发：交由 `yx-frontend-architecture`。

这些是按任务调用的独立 Skill，不自动依赖或继承。不可用时说明缺失并依据已有项目契约工作。

## 输出要求

简述改动、实质取舍和验证结果。评审给出位置、触发条件与影响。仅用户需要完整方案时输出架构文档，不为每次小改动生成流程报告。

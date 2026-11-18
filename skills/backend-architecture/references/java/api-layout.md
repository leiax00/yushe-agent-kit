# Java 模块 api 包组织

## 公开什么，再决定怎么分包

api 是业务模块面向同 JVM 消费方的稳定 Java 契约，不是 HTTP Controller 目录，也不是所有 DTO/枚举的收纳处。先确认实际消费者和公开能力，再创建所需子包；没有跨模块调用时不生成空 api 门面。

MUST 只公开消费者确实需要的接口和数据。契约中的参数、返回值、泛型元素、公开异常和它们递归引用的自定义类型也必须可合法访问；不能用 public DTO 包装内部类型来间接泄露 internal。

## 跨模块访问边界（统一定义）

跨业务模块只依赖提供方 api；不得访问其内部 Repository、Mapper、DO、Service 或直接写其表。参数、结果和递归引用的自定义类型都必须满足公开契约要求。internal 中的 public 类型不会自动不可见，需要架构检查或依赖审查。

经明确允许的专用跨表只读模型属于查询例外，不因此放开内部类型依赖或跨模块写入。具体同 JVM/远程调用及 Adapter 选择，涉及调用时读取 [集成边界](integrations.md)。

## 小模块可以平铺

只有一个查询接口、少量紧密相关的数据类型时，以下结构足够：

```text
device/
├── api/
│   ├── DeviceQueryApi.java
│   └── DeviceSnapshot.java
└── internal/
    ├── web/
    ├── application/
    ├── domain/
    └── infrastructure/
```

不为了只有一个 DTO 强行建 dto/result/response 三层包，也不预先创建 command、event、error 空目录。

## 默认扩展结构：按契约职责拆分

公开类型增加、平铺已不便理解时，SHOULD 采用以下结构，只创建实际用到的部分：

```text
device/api/
├── DeviceQueryApi.java              # 对外查询能力
├── DeviceCommandApi.java            # 对外写能力，有需要才存在
├── dto/
│   ├── DeviceSnapshot.java          # 返回快照
│   ├── DeviceSummary.java           # 摘要
│   ├── DevicePageQuery.java         # 公开查询条件
│   └── RegisterDeviceCommand.java   # 公开写入输入
├── type/
│   ├── DeviceStatus.java            # 公开状态枚举
│   └── DeviceKind.java              # 公开分类枚举
├── event/
│   └── DeviceRegisteredEvent.java   # 供其他模块消费的事实
└── error/
    └── DeviceErrorCode.java         # 消费方需要识别的错误契约
```

接口直接放 api 根包，不再无意义地加 service/interface/facade。按消费者需要划分查询与写接口，不强制读写分离，也不建暴露全部 CRUD 的万能 DeviceApi。

示例选用 `type`，因为此分类允许同时包含公开枚举与稳定标识/值类型；这是组织偏好，不具有技术优越性。若只收纳枚举，`enums` 同样清晰合理；优先沿用项目命名，不同时维护两个同义包，也不把 `type` 当作杂物包。

公开 DTO 放模块自己的 api/dto；不存在全项目 common/dto。DTO 用业务名称或 Command/Query/Snapshot 等角色名，不因放在 dto 包就统一追加 DTO 后缀。

## dto 是否继续细分

只有公开输入/输出类型已形成明显集合且查找困难时，MAY 将 dto 细分为 command、query、result；平铺示例中的快照和摘要可归 result。不要同时设置 result、response、vo 三套同义分类。

此处 Req/Resp 若专属于 HTTP，仍放 internal/web；Java 模块调用的 Command/Query 不应为了外观一致改成 HTTP Req。同名业务用例的内部 Command 默认仍放 internal/application；当它本身就是稳定公开契约时可由 api 拥有并被 application 直接消费，前提是不依赖 internal。真正语义不同或需独立演进时才映射为内部对象。

## 更大模块：按公开能力聚合

当多个公开能力拥有相互独立的消费者和变化原因，可以改为按能力组织：

```text
device/api/
├── registration/
│   ├── DeviceRegistrationApi.java
│   ├── RegisterDeviceCommand.java
│   └── DeviceRegistrationResult.java
├── inventory/
│   ├── DeviceInventoryApi.java
│   ├── DeviceInventoryQuery.java
│   └── DeviceInventoryItem.java
├── type/                           # 仅真正跨上述能力共用的契约类型
└── event/
```

不同时保留 api/dto/registration 与 api/registration/dto 两套位置。模块仍小时优先平铺或默认职责结构；能力划分持续膨胀时检查业务模块边界，不只增加目录深度。没有固定类数阈值，依据理解成本和独立变化决定。

## 枚举、事件和错误的所有权

- `api/type/DeviceStatus` 表达消费者看到的业务状态；内部生命周期状态和规则归 internal/domain。两者语义相同时可以共享稳定公开类型，语义不同时映射，不能为了避免一个转换公开内部状态机。
- 公开类型本身不依赖持久化注解、Web 或内部业务实现。独立部署的服务仍按字符串 code/协议处理枚举与未知值，不能因为存在 Java api/type 就要求服务共享内部枚举 Jar。
- api/event 只放明确供其他模块消费的事实快照。内部领域事件留在 internal，外部 MQ schema 在 messaging 适配；MQ Topic、序列化实现和 Producer/Consumer 不放 api。
- api/error 只公开调用方需要识别和处理的错误码/错误类型。内部异常和诊断细节不全部暴露，HTTP 状态映射仍由 web 负责。
- 技术常量、缓存 key、重试参数、Mapper、DO、RepositoryImpl、Feign/HTTP 客户端都不得放 api。

## 实现、数据类型与边界验证

公开接口如何由应用服务实现、是否需要适配层，统一见 [集成边界](integrations.md)，仅在实现或调整调用链时补读。

公开 DTO/快照按 [record/class 选择](record-vs-class.md) 默认评估 record；枚举仍为 enum，公开能力为 interface，实现为 class。排版与参数数量建议遵循已读编码基线；改变构建方式时按主入口加载数据对象文档。

按 api/internal 划包不是自动可见性控制。使用架构工具时检查实际配置是否覆盖 api 子包、跨包引用和允许依赖，不能假定导出 api 根包就必然递归导出所有子包；具体语法按项目使用的工具版本核实。没有自动检查时明确进行依赖审查。

移动公开 Java 类型到子包会改变全限定名，可能破坏源码、二进制或反射配置。旧契约按兼容要求渐进迁移，不将目录整理当成无行为风险的格式修改。只维护 Skill 时不声称业务仓库已完成这些迁移。

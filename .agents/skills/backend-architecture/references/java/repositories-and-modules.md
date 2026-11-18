# Repository 统一形态与模块拆分

## 统一调用路径

新写或本次明确重构的 Java 模块，MUST 使用：

```text
Controller → XxxAppService → XxxRepository 接口 → XxxRepositoryImpl → Mapper
```

这是当前明确选定的团队边界：用少量仓储接口样板换取持久化隔离，不是要求所有对象都有接口，也不意味着类数量最少。既有模块按任务范围渐进调整，不借更新规范无范围重写存量业务。

- AppService 编排用例、业务资格与事务；访问持久化时只依赖 Repository 接口，不注入 RepositoryImpl、Mapper、IService 或 ServiceImpl。它仍可依赖其他模块公开 API、外部能力 Port 及必要领域协作对象。
- Repository 定义本模块需要的持久化能力，不能继承 IService/BaseMapper，也不复制完整通用 CRUD API。
- RepositoryImpl 位于 persistence，MAY 继承 MyBatis-Plus ServiceImpl，也 MAY 直接组合 Mapper；ServiceImpl 是实现复用工具，不等同领域 Repository。
- Mapper、Wrapper、BaseMapper、IService、ServiceImpl 等数据访问技术类型限制在 persistence 实现边界（集中技术配置除外），不出现在用例和 Repository 契约中。禁止 getBaseMapper 等旁路。IPage/Page 在持久化边界转换为独立分页模型。
- 不再增加一套仅转发 CRUD 的 DataService；真正需要内部协作时可局部拆实现，但不能重复堆叠 DataService/Repository/Adapter。

ServiceImpl 继承的公开方法并不会因为实现了 Repository 接口而消失；通过接口注入并检查依赖来限制访问，不宣称 Java 自动隐藏这些方法。架构检查应拒绝应用层引用持久化实现和框架数据访问类型。

Repository 方法表达实际查询、插入、更新、加锁或聚合保存语义。不要默认把底层布尔返回值等同于整个用例成功；检查影响行数、冲突与失败语义，保留数据库异常原因。

## 接口、模型和实现的位置

默认统一把内部 Repository 接口放 `internal/repository`；实现、Mapper、DO 放 `internal/infrastructure/persistence`。复杂模块也可沿用已确定的 `domain/repository`，但同一职责只保留一处接口，不在两处创建重复门面。repository 包是内部契约，不是跨模块公开 api。

```text
device/internal/
├── web/
│   ├── DeviceController.java
│   ├── CreateDeviceReq.java
│   └── DeviceResp.java
├── application/
│   └── DeviceAppService.java
├── repository/
│   └── DeviceRepository.java
├── domain/                         # 只有真实领域规则时建立
└── infrastructure/persistence/
    ├── DeviceRepositoryImpl.java
    ├── DeviceMapper.java
    └── DeviceDO.java
```

简单 CRUD MAY 在 AppService 与 Repository 间复用本模块 DO，避免复制没有独立语义的对象。这是对“纯粹隔离持久化模型”的明确简化：应用层可能引用 DO，但仍不得直接操作 Mapper/Wrapper，也不得用 DO 自动绑定外部输入。若需要完全隔离持久化注解/模型，再使用应用数据模型，不为了统一形式强制复制。

复杂业务 Repository 使用领域对象和业务值类型，实现负责 DO 转换。domain 不依赖 persistence DO 或 MyBatis；domain 的逻辑接口即使位于内部 repository 包，依赖仍向业务模型，不反向指向技术实现。

普通查询可用独立查询投影，不强制重建聚合。查询端口与 Repository 若表达同一能力只保留一个；不为了命名统一复制 ReadRepository/QueryPort 两套接口。

## 一个业务模块允许多个 Repository

Repository 围绕业务对象、聚合及一致性边界设计，不按表一一对应。例如 OTA 可以包含 FirmwareRepository、UpgradeRuleRepository、UpgradeTaskRepository。

一个 UpgradeRuleRepository 实现可以协调规则表、条件表、路径约束等多个 Mapper，保存完整聚合。多表聚合不适合单表 ServiceImpl 时直接组合 Mapper，不强制继承。

一个 AppService MAY 协调多个本模块 Repository，事务边界仍由业务用例决定。同一事务资源与事务管理器下的操作按实际配置参与事务；不要因每个 Repository 有多个写入就各自 REQUIRES_NEW，也不把跨服务写入宣称为本地原子提交。

注入多个 Repository 时按 [编码基线](coding-style.md) 检查依赖与构造参数；需要报告取舍时给出实际用例，不通过万能上下文隐藏依赖。

## 何时按能力继续分包

多个 Repository 本身不触发拆包。先保持按职责的平铺；当一个能力的修改经常穿过大量无关文件、规则/消费者/变化原因相互独立，或需要明确内部访问边界时，再按能力聚合。

```text
ota/
├── api/
└── internal/
    ├── firmware/
    │   ├── application/
    │   ├── domain/
    │   ├── repository/
    │   └── persistence/
    ├── rule/
    │   ├── application/
    │   ├── domain/
    │   ├── repository/
    │   └── persistence/
    ├── task/
    │   ├── application/
    │   ├── domain/
    │   ├── repository/
    │   └── persistence/
    ├── web/
    └── integration/
```

这里能力内的 persistence 仍是基础设施边界，省掉额外 infrastructure 层级是目录简化，不改变依赖规则。每个能力只创建实际需要的子包；DO/Mapper 数量增加时可在 persistence 内分 model/mapper，不预建空目录。

不要同时存在职责不清的根 repository 与能力 repository 两套位置。跨能力的数据归属仍唯一：用例通过所属 Repository/能力接口协调，不直接写另一能力的数据表。若能力确实有独立业务语言、所有权和演进边界，应评估提升为并列业务模块，而不是无限嵌套子包。

同一模块能力划分不自动产生独立部署、分库或子模块 api；只为实际稳定消费者设计必要接口。

## 涉及跨模块时

同模块多 Repository 与跨领域调用是不同边界，不能以“统一 Repository”把远程服务伪装成可一起提交的本地仓储。出现跨模块消费者时读取 [公开访问边界](api-layout.md)；实现调用链时读取 [集成边界](integrations.md)。

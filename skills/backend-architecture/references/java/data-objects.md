# 数据对象、值对象与跨层传输

MUST 按语义和契约所有权划分对象，不按“每经过一层复制一次”划分。

| 角色 | 默认命名 | 归属 |
|---|---|---|
| HTTP 输入/输出 | CreateDeviceReq、DeviceResp | internal/web；需要时按项目约定细分请求/响应包 |
| 写用例输入 | CreateDeviceCommand | internal/application；复杂用例按需放 create |
| 查询输入/结果 | DevicePageQuery、DeviceListItem、DeviceDetail | internal/application；复杂查询按需放 list |
| 领域实体/聚合 | Device、UpgradeRule | internal/domain，规模增加再细分 model |
| 领域值对象 | Imei、VersionNumber、Money | 领域概念附近 |
| 持久化对象 | DeviceDO | internal/infrastructure/persistence |
| 模块公开契约 | DeviceSnapshot | api，由提供方管理 |
| 远程传输对象 | RemoteDeviceResp | 消费方 infrastructure/integration |

新代码 SHOULD 使用 DO 表示数据库映射，不用 Entity 指代数据库表对象；领域实体使用业务名称。HTTP 响应用 Resp，不用含义模糊的 VO；领域 Value Object 用业务名；不使用万能 BO/全局 dto 包。已有公开名称不能未经迁移直接破坏。

公开模块 DTO 的平铺、api/dto 及按能力拆分规则见 [api 包组织](api-layout.md)。只有对外契约才放 api，内部用例对象仍放 application；契约所有权相同时允许直接复用，不机械复制。

类型选择另由 [record/class](record-vs-class.md) 定义，仅在新增类型或改变值语义、可变性时补读；沿用既有类型的字段调整不自动触发重新选型。

## 允许复用的边界

简单内部 CRUD，Web 和 Application 数据语义相同、无独立演进需求时 MAY 共用应用层输入/只读结果；接受校验注解带来的有限技术耦合，并记录取舍。应用对象必须归应用层，不能为了复用让 application 反向 import web。

公开长期 API，或者同一用例被 HTTP/MQ/定时任务调用时 SHOULD 分开 Req 与 Command，以隔离绑定、安全及协议变化。字段相似不代表语义相同；HTTP 响应、模块 API DTO 和外部消息契约通常有不同演进周期。

领域方法接收业务参数或值对象，不接收 Web Req/Application Command。不为 Application→Domain 再添加没有独立语义的 DomainDTO。

## 写与读

复杂写：Req → Command → Device/Imei → Repository → Converter → DeviceDO/Mapper。转换在真正需要保护的边界发生，保存语义明确为 insert/update 或带版本检查的聚合保存。

简单 CRUD 可保留 Req/Resp/DO 作为主要对象，AppService 与 Repository 接口可在模块内部复用 DO；这是模型隔离的明确简化，不放开 Mapper/Wrapper 边界。复杂领域接口使用业务模型而非 DO。DO 不跨模块流转，不直接作为外部任意字段绑定对象。

普通读：RepositoryImpl 内的 Mapper/SQL 可以直接投影为 DeviceListItem，通过 Repository/实际需要的查询端口返回应用层；不要求 DO→Domain→DTO。应用层不直接调用 Mapper，不重复定义语义相同的 Repository 与 QueryPort。框架 IPage/Page/Wrapper 留在适配器；对外使用自定义 PageResult，不让持久化 API 成为公共契约。

## 值对象与映射

值对象不可变、按值相等，并在创建时保护不变量。例如 Imei 负责业务所需的格式/校验位规则，Money 包含币种和精度；不能将只检查长度的示例宣称完整验证。

值对象自身不依赖 MyBatis 注解或接口。TypeHandler 负责单字段 Java/数据库转换，Repository Converter 负责 DO 与领域模型的整体转换；两者不互相替代。简单 ID/状态可直接在 Converter 转换，只有确有价值时增加 TypeHandler。

通过真实 Mapper 路径验证自定义 TypeHandler 的注册、读取、写入、null 和未知编码；复杂查询 XML 的映射不能假定跟随默认 CRUD 生效。

## 对象构建与 Lombok

### 拆分与构建方式

字段多先检查职责，能形成真实业务概念时拆分；不得机械地每 3 个字段凑一组。无法合理拆分的多字段契约/查询/快照，MUST 使用有字段名的 Builder 构建，避免长串位置参数；少量字段可直接构造。通用格式与参数数量建议仅由 [编码基线](coding-style.md) 定义。

Lombok 是可选工具，Builder 是此处设计要求。已有 Lombok 时优先复用；无适配版本或不宜增加依赖时使用小型显式 Builder。不要为了 Builder 改造整个实体继承链，也不对全部 DO 一刀切禁用 Builder；先验证父类字段和实际构建路径。

### 不变量与默认值

所有构建入口必须保留必填、范围、组合约束、规范化和防御复制。生成的全参构造器/Builder 不能假定调用 setter；setter 有语义时追踪每条入口，不因减少样板删除承载规则的构造器。

普通构建明确缺省值及非法组合；涉及外部输入默认值或 PATCH 时，按 [输入契约](input-contracts.md) 确定绑定语义，本节不另定义缺失/null 规则。Builder 本身不保证业务有效性或不可变性。

### 注解选择

注解按职责选择：DO/可变输入可用 Getter/Setter/无参构造，领域聚合不无差别 @Data 或公开 setter。审查生成 equals/hashCode、toString 与父类字段语义，敏感对象不直接打印。record 不重复生成普通 getter，泛型 Builder 推断失败时再显式给类型参数。

### 验证构建路径

测试实际缺省、非法组合和共享可变集合；确认生成入口没有绕过校验，不能只验证能 build。

[Builder 官方文档](https://projectlombok.org/features/Builder) 供核对生成行为；实际版本与注解处理能力以业务仓库为准。

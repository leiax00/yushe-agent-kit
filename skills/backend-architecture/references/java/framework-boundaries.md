# 公共框架与业务模块的边界

只有存在实际复用需求时才提炼 framework 模块或 starter；先检查已有能力。不要因为要写第二个 Mapper 就创建框架，也不要复制完整脚手架和历史依赖。

## 可以提炼

一致的数据库/MyBatis 技术依赖组合、分页装配、必要技术扩展，以及业务无关的分页/错误等基础契约。按技术职责保持内聚，避免 db、MyBatis、MyBatis-Plus 多个仅转发依赖的薄壳。

具体 Spring Boot 自动配置注册方式按项目版本核实。装配应支持合理默认、应用覆盖及必要条件；不能写死业务包，也不为探测配置主动建立数据库连接。应用决定业务扫描范围与环境配置。不要提供静默降级为无事务的生产路径。

依赖版本沿用 BOM/父工程集中管理；服务不重复复制框架已经提供的依赖组合。框架不默认加入多数据源、读写分离、额外驱动、租户插件或通用业务基类。

## 必须留在业务或应用侧

业务 DO、Mapper、聚合仓储实现、SQL、迁移、数据范围政策和业务校验属于业务。数据库地址、凭据、环境连接池配置由应用环境管理，不能硬编码进框架。可信操作者可通过技术接口提供，框架不能反向依赖 identity 等业务实现。

共享分页契约不携带 IPage/Servlet，ORM 转换由具体适配器承担。业务常量和 DTO 不因多处使用自动上移 framework-common；仍由实际业务所有者公开稳定契约。

## 防止重复层次

沿用当前 [Repository 统一形态](repositories-and-modules.md)：简单和复杂用例均通过 Repository 接口访问持久化，RepositoryImpl 按需使用 ServiceImpl 或 Mapper，统一范围条件和重复持久化规则。应用层不得直接使用 Mapper/ServiceImpl，也不新增并行 DataService 门面。

复杂领域以聚合 Repository 隔离持久化，不额外叠加数据 Service→Repository→Adapter 多层 CRUD 转发。一个 Repository 可以组合多个 Mapper，一个模块也可以有多个 Repository；仅在职责分化后按能力聚合。

查询投影允许由 application 定义查询模型/端口，并由 infrastructure 实现；这是约定的依赖倒置，不因旧规范要求全放 model 而搬迁。不要让 Mapper 签名引用 Controller/Handler/Service 的私有嵌套实现类型，必要的跨边界模型应有独立、清晰的契约归属。

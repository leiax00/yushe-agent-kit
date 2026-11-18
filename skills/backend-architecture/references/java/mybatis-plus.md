# MyBatis-Plus 持久化规范

## 版本与边界

先确认 MyBatis-Plus、MyBatis、Spring Boot 和数据库版本及已有插件链。依赖拆分、分页解析器和插件行为随版本变化，应核对所用版本文档；不要为了套用示例自动添加最新版依赖。

DO、Mapper 和 RepositoryImpl 位于 persistence。简单和复杂模块均采用 AppService → Repository 接口 → RepositoryImpl → Mapper；AppService 不访问 Mapper/Wrapper 或继承的 CRUD 旁路。Repository 接口不继承 IService/BaseMapper，不暴露数据访问技术类型，参见 [统一 Repository 形态](repositories-and-modules.md)。

RepositoryImpl MAY 继承 ServiceImpl 复用能力，也 MAY 直接组合 Mapper；不强制继承。多表聚合可使用多个 Mapper，ServiceImpl 不能替代领域契约。只暴露实际所需 Repository 方法，明确 insert/update、聚合保存和冲突语义，不叠加纯转发 DataService。

对象分类与 TypeHandler 读取 [数据对象](data-objects.md)，枚举映射读取 [枚举规范](enums-and-constants.md)。

## 映射与输入

主键策略应与数据库、分布式生成方式及外部契约一致；大整数跨 JavaScript 边界时需保证精度。明确表列、枚举业务值、时间和 JSON 类型映射。自动填充审计字段前确认实际插入/更新路径支持填充，不把 fill 当作权限校验。

更新只映射允许修改的字段。区分“未传”“显式置空”“保持原值”，结合字段更新策略验证 SQL；不要靠全量 DTO 拷贝或全局允许 null 更新实现 PATCH。

## 查询与 SQL

- 值使用参数绑定；动态列名、排序字段从服务端白名单映射，不能直接拼入用户字符串。
- Lambda Wrapper 适合普通单表查询；复杂连接、统计和批量处理用可审查的 XML/SQL，并保留参数绑定。
- 谨慎使用 `${}`、last、apply 等原始 SQL 能力，不能让不可信输入进入结构片段。
- 列表必须分页或使用受限批次，设置页大小上限及稳定排序；大偏移按需求改为游标分页。
- 显式选择所需字段，避免循环中逐条查询的 N+1；批量 IN 要考虑数据库参数限制与结果排序。
- 更新和删除检查条件及影响行数。即使启用防全表更新插件，也要验证业务条件完整。

## 并发与租户

例如库存扣减的 SQL 意图为：

```sql
UPDATE inventory
SET available = available - :quantity, version = version + 1
WHERE id = :id AND tenant_id = :tenant_id
  AND available >= :quantity AND version = :expected_version;
```

此处冒号参数仅表达绑定意图，落地为 Mapper 时按实际 MyBatis 语法绑定。先验证 quantity > 0；影响行数为 0 是并发冲突、库存不足或对象不可见，需按业务语义处理，不能继续返回成功。

乐观锁插件的生效取决于实体版本字段、调用方式和插件配置；自定义 SQL 不能默认被自动保护。重试必须重读状态并重新判定业务规则，不能盲目重放支付等外部副作用。

租户拦截器是纵深防御，不替代认证和资源授权。测试自定义 SQL、连接查询、异步任务和显式忽略拦截器的路径。客户端传来的 tenantId 不能直接成为可信隔离条件。

## 逻辑删除、唯一性与性能

逻辑删除改变查询与唯一性语义：数据库唯一约束仍作用于已删除记录，需按数据库能力设计“仅活跃记录唯一”或允许复用的键。不要机械使用 unique(业务键, deleted) 并声称支持反复删除和重建。

确认自定义 SQL、统计、关联和管理员查询的删除过滤。逻辑删除不等于隐私数据清除。

分页插件位置、数据库方言及多插件组合按实际版本确认；复杂连接的 count 与结果行数可能不一致，应验证计数 SQL。用真实数据分布检查执行计划，区分数据库批量语句、批处理执行和事务边界；禁止无界大事务。

## 最低验证集合

包含分页边界、null 更新、唯一冲突、乐观锁冲突、租户隔离、逻辑删除过滤和受影响行数。对本次没有涉及的插件不强行启用或追加测试。

## ORM 使用与元数据补充

常规 CRUD 优先复用现有 BaseMapper/Wrapper，不重复手写相同 SQL。新写复杂关联、聚合或特殊批量 SQL 默认放 Mapper XML，Java Mapper 保持方法签名与参数绑定，避免把大段 SQL 写进注解；已有合理实现不因本次规范更新强制迁移。

复合键按实际键结构定位和更新，不为迎合框架伪造单主键，也不调用并不适用的 ById 方法。范围条件必须覆盖普通 CRUD、自定义 SQL、批量和锁定查询，不允许按 ID 更新时漏掉租户或业务可见范围。

创建时间与创建者不能被更新覆盖；更新者来自可信服务端提供者，无登录用户的任务采用明确系统主体或约定空值，不伪造用户。更新者为空时明确定义是否清空，避免保留上次操作者造成错误归因。备注等业务可编辑字段不能自动当作审计元数据填充。

自动填充必须验证实际调用形态，特别是仅 Wrapper、空实体、批量、自定义 SQL 的路径不能假定与标准实体更新等价。生成 SQL/Wrapper 的离线测试只能证明构建意图，不能证明数据库执行、锁、约束和回滚。

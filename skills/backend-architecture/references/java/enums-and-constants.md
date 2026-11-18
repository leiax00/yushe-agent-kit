# 枚举、常量、错误码与配置

## 所有权

MUST 让业务类型默认归属拥有该概念的模块，而非全局 common/enums、constants、dto。

| 类型 | 示例 | 位置 |
|---|---|---|
| 内部领域状态 | DeviceLifecycleState、UpgradeRuleStatus | 所属 internal/domain/model 或 type |
| 公开模块枚举 | 由 OTA 拥有的 UpgradeChannel | 确需共享时 ota/api/type |
| 应用执行参数 | 分批处理策略 | 所属 internal/application 用例附近 |
| 技术常量 | OtaCacheKeys、MQ Topic | internal/infrastructure/cache 或 messaging |
| 业务限制 | UpgradeLimits | 领域模型/策略附近 |
| 可配置运行参数 | UpgradeProperties | internal/config 或已有配置包 |
| 业务错误/异常 | OtaErrorCode、UpgradePathConflict | 默认模块内部，公开契约需要时 api/error |
| 稳定通用技术定义 | CommonErrorCode | shared/error，且不得反向依赖业务模块 |

目录不必细分到每类类型；一个枚举只被一个模型使用时放在同包。业务异常不能全部变为只有字符串消息的全局 BusinessException；边界处统一映射 HTTP 错误不改变业务所有权。

api/type 只承载确需公开的稳定类型，默认不再另建同义 enums 包；细化规则见 [api 包组织](api-layout.md)。

## 编码规则

SHOULD 对新业务状态/通道采用显式稳定字符串 code，例如 online、production、running。Java 常量名可调整，外部 code 不因此改变；MUST NOT 以 ordinal 持久化，也不隐式把 name() 当作长期协议。

数值协议、位掩码、已有系统兼容或有证据的存储需求 MAY 使用数字业务码。业务 code 与等级 level 分开，不能因为通道等级可比较就把等级充当持久化身份。

数据库默认选可演进字符串列，长度/约束由 database-design 决定；是否用原生 ENUM 结合已有数据库约定判断，不为新规范破坏存量数字码。

## Java 与 MyBatis 的隔离

严格领域隔离：领域 Enum 只含稳定 code 和业务行为；DO 使用 String，经 Converter/基础设施 TypeHandler 转换。不得把 @EnumValue 放到要求技术无关的领域枚举上。

简单 CRUD 或基础设施专属枚举 MAY 使用 MyBatis-Plus 的显式枚举映射，需根据实际版本确认配置与序列化行为。数据库映射与 HTTP JSON 序列化是两个不同约定，不能配置一个就假定另一个相同。

未知外部编码明确选择保留原值、映射显式 UNKNOWN 或拒绝并返回可理解错误；不能把未知值默认为成功/在线/已支付。严格领域恢复遇到非法持久化值应可诊断，不默默修改含义。

## 行为、常量与共享

稳定通道规则可由 Enum 行为表达；动态配置规则转为领域策略，不继续硬编码。业务固定限制归领域，算法保护参数归实现；随环境变化的超时/重试/批量值使用受校验配置。Redis key 用生成方法封装，不让多个用例随意拼接。

同 JVM 确有稳定共同语义时可依赖所有者 api/type；独立部署服务优先交换字符串协议并映射本地类型。必须检查共享是否造成循环依赖。已有框架 HttpStatus/HttpHeaders 等技术定义直接复用，不重复建无价值常量。

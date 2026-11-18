# 模块 API、跨服务调用与事件

## 入站、编排与出站

始终以当前模块为参照，方向不由读/写决定：别人查询本模块也是入站。

| 角色 | 所属位置 | 方向 |
|---|---|---|
| 提供给同 JVM 其他模块的接口 | api | 入站契约 |
| 接收 HTTP 请求 | internal/web | 入站协议适配 |
| 执行用例、组织协作 | application | 内部编排 |
| 本模块定义所需外部能力 | application/port | 出站契约，按需建立 |
| 调用外部 HTTP/RPC | infrastructure/integration | 出站适配 |

同 JVM 默认由 XxxAppService 直接实现公开 API 接口。调用方注入接口，运行时由其实现执行；只公开必要方法，无需为一次转发再建 Facade。公开契约需要组合/转换多个用例时才增加独立 API 实现类。

OTA → DeviceQueryApi → DeviceAppService：对 OTA 是出站，对 Device 是入站。简单同 JVM 调用不强制再包 Port/Adapter；独立部署通信按出站端口隔离。外部 HTTP 请求仍由 web 接收，不进 integration。

## 三类边界

1. 同 JVM：OTA 用例 → device/api/DeviceQueryApi → device/internal/application 的实现。只返回 DeviceSnapshot 等公开契约，不返回 DO/Mapper/内部领域对象。
2. 独立部署服务：OTA application 定义 DeviceInfoPort 和本地 DeviceInfo；infrastructure/integration 的 DeviceHttpAdapter 实现端口、调用 HTTP/RPC Client，并将 RemoteDeviceResp 转成 DeviceInfo。用例不知道 Feign/RestClient/WebClient/gRPC 的实现类型。
3. 异步事件：领域事件表达内部事实；模块公开事件放所有者 api/event；跨服务消息使用明确版本化的 schema，在 messaging 适配层转换，不直接序列化内部领域对象。

## 远程调用布局

```text
ota/internal/
├── application/
│   ├── check/CheckUpgradeHandler.java
│   └── port/
│       ├── DeviceInfoPort.java
│       └── DeviceInfo.java
└── infrastructure/integration/device/
    ├── DeviceHttpAdapter.java
    ├── DeviceHttpClient.java
    └── RemoteDeviceResp.java
```

Port 的抽象由消费方定义，字段只包含用例所需信息；远程传输 DTO 留在适配器。提供方 HTTP 入口位于其 internal/web/internal 或已有对应入口。

使用项目已有 HTTP/RPC 栈；接口声明并不自动产生可用 Bean，需按所用版本完成代理/客户端装配。明确认证、超时、资源限制、追踪、错误映射以及可安全重试的操作。不可默认内部网络可信，也不能把远程成功副作用当作本地事务可回滚的一部分。

## 共享与独立发布

Java 服务确有共享需求时可拆 device-api 契约 Jar 和可选 device-client SDK；消费者不依赖 device-service 实现 Jar。api Jar 不携带 ORM 实体或内部业务实现，client SDK 也不能反向决定应用端口设计。

多语言或独立协议演进优先评估 OpenAPI/Protobuf 等契约；消费方处理未知字符串业务码，避免直接共享内部 Java Enum 导致同步发布。共享契约类型与共享内部实现不是一回事。

## 事件与查询

需要即时结果的查询优先同步模块 API/远程查询，不为降低表面耦合全部改成事件。通知、审计等已发生事实可事件化；可靠跨进程交付需考虑 outbox、幂等、重试和恢复。若双向公开契约产生模块循环，重新划分概念所有权、提炼必要稳定契约或改用事件，不把所有业务类型搬入 shared 来隐藏循环。

跨模块可访问的类型及只读例外统一见 [公开访问边界](api-layout.md)；模块内部多仓储的组织按主入口加载 Repository 文档。

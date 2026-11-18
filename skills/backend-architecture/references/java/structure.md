# Java 项目架构与目录组织

## 架构基线

SHOULD 采用 Spring Boot 模块化单体、业务 Package 优先、复杂业务轻量 DDD、查询侧适度简化。先逻辑模块化，按团队/构建/发布需求再物理拆分，不为每层创建 Maven Module。

先核对 pom.xml/Gradle、toolchain、BOM 和现有结构。原讨论的 Java 21/25 LTS 选型不是强制升级指令。新增模块采用当前约定；既有模块局部修改保持兼容，必要偏离明确说明，不扩大重构范围。

## 默认项目结构

```text
iot-platform/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/example/iot/
    │   │   ├── IotApplication.java
    │   │   ├── identity/
    │   │   ├── product/
    │   │   ├── device/
    │   │   │   ├── api/                    # 公开契约，有消费者才建立
    │   │   │   └── internal/
    │   │   │       ├── web/                # Controller、Req、Resp
    │   │   │       ├── application/
    │   │   │       │   └── DeviceAppService.java
    │   │   │       ├── repository/
    │   │   │       │   └── DeviceRepository.java
    │   │   │       ├── domain/             # 按真实复杂度建立
    │   │   │       ├── infrastructure/
    │   │   │       │   ├── persistence/    # RepositoryImpl、Mapper、DO、Converter
    │   │   │       │   ├── integration/    # 外部调用适配
    │   │   │       │   └── messaging/      # MQ 适配
    │   │   │       └── config/             # 必要配置和装配
    │   │   ├── ota/
    │   │   ├── system/
    │   │   └── shared/                     # 稳定、无业务归属技术能力
    │   └── resources/
    │       ├── mapper/                    # 按模块组织 XML，沿用扫描配置
    │       └── db/migration/              # 沿用实际迁移工具
    └── test/java/com/example/iot/
```

示例表示职责位置，不要求创建所有目录。默认 internal/web，不使用 interfaces/rest。完整 Repository 形态、多仓储和能力分包规则必须读取 [Repository 与模块](repositories-and-modules.md)。

## 应用层从简单开始

简单业务使用 XxxAppService，不使用冗长 XxxApplicationService；一个内聚能力的读写用例可共处，不预先拆 Command/Query/Handler。只定义实际需要的 Req/Resp、输入和结果对象，不为每层复制同构 DTO。

规则、用例和变化原因增多时再按 create/check/publish 等用例拆 Handler/Command/Query，或按 firmware/rule/task 能力聚合。AppService 不能成为万能巨型服务；也不能仅因为有读写两种方法就引入完整 CQRS、双库或事件溯源。

新 HTTP 类型默认 XxxReq/XxxResp；查询结果和快照仍可用 DeviceDetail/DeviceSnapshot 等业务名。存量公共名称按兼容需求处理，不批量强改。

## api/internal 和依赖方向

- api 仅公开接口、DTO、必要枚举/错误契约/事件，不能引用 internal。细分遵循 [api 包组织](api-layout.md)。HTTP Controller 仍在 internal/web。
- web 调用 application，application 不依赖 web；数据访问统一依赖 Repository 接口，不依赖 Mapper 或持久化实现。
- Repository 接口默认 internal/repository；复杂模块沿用 domain/repository 也可，但不重复定义。业务语义与依赖方向优先于物理目录。
- RepositoryImpl/Mapper/Wrapper/ServiceImpl 在 persistence；实现按需继承 ServiceImpl 或组合 Mapper。简单 CRUD 允许模块内部复用 DO 是明确的模型隔离简化，见专项规范。
- domain 不依赖 MVC、MyBatis、HTTP Client 或 DO；复杂聚合通过业务行为保护不变量，持久化转换由实现负责。
- application 所需外部 Port 由消费方定义，integration 实现；配置/启动装配具体实现。
- 出现跨模块消费者时读取 [公开访问边界](api-layout.md)，本文件不另定义跨模块规则。

web 按实际受众可分 admin/device/internal，命名不是安全隔离；所有入口仍需适用认证授权。

## 拆分构建或部署

先一个应用按业务包组织。必要时拆 platform-boot 组合根、platform-shared、module-device/module-ota 等，不按全局 web/application/domain 技术层横切。

独立服务内部仍可模块化；完全没有同 JVM 消费者的服务可省略无用途 api 门面，以 HTTP/RPC/消息契约交互。包增长先判断业务能力与所有权，不按 Repository 数量或类数机械拆模块。

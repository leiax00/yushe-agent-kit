# record 与 class 的选择规范

## 先判断语义，再选语法

本项目的默认判断：对象表示“创建后保持稳定的一份值/数据”，且按全部组成值判断相等符合业务含义时，优先 record；对象表示“有身份和生命周期的事物”、需要受控状态变化或提供服务能力时，使用普通 class。record 本身也是一种 class，这里 class 指普通类。

这不是“DTO 一律 record、带方法一律 class”。record 可以有校验、计算和返回新值的业务方法；普通 class 也可以不可变。字段多少、是否使用 Lombok/Builder 都不是第一判断依据。

## 本项目默认选择表

| 场景 | 默认选择 | 选择条件/例外 |
|---|---|---|
| Command、Query、Result、列表投影 | record | 一次构建后作为稳定输入/结果传递；绑定或映射不支持时用 class |
| HTTP JSON Req/Resp | record | 实际序列化、反序列化和校验链路支持；表单/multipart/旧 Bean 绑定按实际能力选择 class |
| 模块 API DTO、远程 DTO、事件快照 | record | 适合稳定数据快照；发布契约变更需单独评估兼容性 |
| 领域值对象，如 Imei、VersionNumber、DateRange | record | 组成值定义业务含义，构造时校验；需隐藏表示或定制相等语义时评估不可变 class |
| 领域实体/聚合，如 Device、UpgradeRule | class | 有业务身份、生命周期和受控状态转换；不能默认按所有字段生成 equals/hashCode |
| MyBatis/MyBatis-Plus 表映射 DO | class | 本项目默认支持常见字段映射、ID 回填、审计填充及更新流程；不宣称 MyBatis 无法使用 record |
| 只读 SQL 查询投影 | record | 实际构造器映射及空值/类型转换已验证；它是查询结果，不承担可变 DO 的职责 |
| Controller、Handler、Service、Repository 实现、Adapter、配置装配 | class | 表达依赖与执行职责，不是透明值载体 |
| 配置属性对象 | 按绑定方式决定 | 构造器绑定并固定配置可用 record；需要 JavaBean 绑定/受支持的可变机制时用 class |

## 必须选择/保留 class 的信号

对象需要创建后改变实例状态、依赖类继承/子类代理、保留组件列表以外的实例状态，或不应公开完整表示时，采用 class。不要为适配 record 暴露不该公开的字段或重建复杂状态管理。

实体的身份与状态分开处理；同一个设备改变固件版本后仍是同一业务实体。不要为了省代码让 record 的默认全组件相等语义替代身份设计。也不要对实体直接使用 Lombok @Data/@Value 的生成相等逻辑而不审查。

class 不等于公开 setter：聚合通过 activate、changeChannel 等业务方法变化；禁止任意 setter 绕过规则。只读 class 同样可以用 final 字段与构建边界保持不可变。

## record 使用约束

排版遵循 [编码基线](coding-style.md)。构造时保护值对象不变量；DTO 格式校验与领域规则分开，不把网络/数据库调用塞进构造器。

```java
public record DateRange(
    LocalDate start,
    LocalDate end
) {
    public DateRange {
        Objects.requireNonNull(start, "start");
        Objects.requireNonNull(end, "end");
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("开始日期不能晚于结束日期");
        }
    }

    public boolean contains(LocalDate date) {
        Objects.requireNonNull(date, "date");
        return !date.isBefore(start) && !date.isAfter(end);
    }
}
```

示例需导入 java.time.LocalDate、java.util.Objects；表示日期区间且包含两端。它有业务行为，但仍适合 record，因为不改变自身状态。

record 只保证组件引用不可重新赋值，不保证引用对象深度不可变。集合/数组/可变日期需要合适的防御性复制；若使用 List.copyOf，必须接受并说明其拒绝 null 元素的语义。集合中元素若仍可变，仅复制集合不足以构成不可变快照；数组输入复制后还要考虑访问器泄露。

默认 equals/hashCode 基于组件；数组组件不会自动得到按内容比较的值语义，金额的小数精度等也可能影响业务相等。优先选择符合语义的不可变组件和规范化方式；不要为迁就 record 编写一整套难懂的相等性补丁。

自动 toString 可能包含敏感组件，不能把口令/令牌 DTO 直接写日志。是否使用 record/class 都不能替代日志脱敏和访问控制。

## 框架兼容与演进检查

选择类型前看项目 JDK、JSON/Bean Validation、ORM 映射和注解处理版本，并通过实际调用路径验证；语言支持不等于框架的所有绑定模式都支持。不要未经验证就把现有 DO、表单模型或代理对象批量替换成 record。

改 class 为 record 会改变构造方式、访问器命名、相等性和默认字符串表示，可能破坏反射/Java 调用方。record 新增组件也会改变构造器；JSON 消费方兼容与 Java 二进制兼容要分别判断。按现有契约演进规则处理，不将这种改动视为纯格式化。

类型变更重点检查构造/访问兼容、集合复制、值相等、敏感日志和实际框架能力。若同时改变输入契约，按主入口另选对应文档；只改规范时不宣称已验证业务框架。

## 依据

[Oracle Java 21 Record Classes](https://docs.oracle.com/en/java/javase/21/language/records.html) 用于核对语言特性。上面的角色选择表是本项目的设计约定，不是 Java 语言对 DTO、领域实体或 ORM 的强制分类。


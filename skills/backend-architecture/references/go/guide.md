# Go 后端扩展入口

检查 go.mod、工具链、路由和数据库驱动。包以业务能力命名，利用 internal 控制可见性；避免为模仿 Java 建立大量空层和接口。

接口优先由消费方按最小需要定义，具体类型实现细节留在适配器。显式传播 context、截止时间和取消；不要把请求 context 长期保存到结构体。事务使用实际驱动的 Tx 并明确 commit/rollback，不能跨 goroutine 假定事务安全。

错误携带上下文并通过 errors.Is/As 等项目约定识别；HTTP 边界映射稳定错误。并发任务明确退出与资源释放，避免无界 goroutine。sqlc、GORM 或 database/sql 均按已有选型封装，不强制替换。

新增框架或数据层规则放在本目录，更新 SKILL.md 的条件路由；优先补充实际使用的 sqlc/GORM 或路由框架指南。

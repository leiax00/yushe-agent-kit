---
name: database-design
description: 设计或评审关系型数据库表、约束、索引、事务策略及可演进迁移；覆盖 MySQL/PostgreSQL 差异，ORM 封装交由后端架构 Skill。
---

# 数据库设计

先确认数据库产品/版本、现有 schema、迁移工具、数据规模、主要查询、读写并发和可用停机窗口。信息不足时给出明确假设，不默认具备在线 DDL 或零停机能力。

1. 表结构、字段、唯一性和隔离需求读取 [模型与约束](references/modeling.md)。
2. 索引、慢查询、锁和并发读取 [索引与事务](references/index-and-transactions.md)。
3. 任何结构或数据演进读取 [迁移与兼容](references/migrations.md)。
4. 按实际产品读取 [MySQL/PostgreSQL 差异](references/engines.md) 的相关部分。
5. 如果变化影响外部字段或查询语义，显式加载 `api-design`；ORM 映射/调用实现属于 `backend-architecture`，不得假定另一个 Skill 自动继承。

交付 DDL/迁移建议、关键查询与索引对应关系、兼容顺序、风险及验证结果。生成迁移文件不等于执行迁移；是否执行按用户授权和目标环境判断，不能因加载本 Skill 自动操作生产库。

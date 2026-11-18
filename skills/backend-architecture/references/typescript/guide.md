# TypeScript 后端扩展入口

保留已有框架和构建方式，检查 tsconfig、包版本和运行时。按业务模块组织 route/controller、use-case、model、adapter；不强制使用 NestJS 或装饰器。

外部 JSON 需要运行时校验，TypeScript 类型断言不能提供校验。避免 any 穿透边界；明确 undefined、null 和未传字段。用 Promise 链路传播异常，独立任务应有失败处理。事务对象限于用例边界，不能默认异步上下文自动传递事务。

数据库访问通过项目已有 Prisma、Drizzle 或其他适配器；不要为统一风格更换 ORM。金额、大整数和日期在 JSON 边界明确表示方式。验证事务失败、并发请求和资源授权。

扩展时在本目录新增 nestjs.md、fastify.md 或持久化适配指南，并在 SKILL.md 添加带触发条件的链接；仅为实际选用的框架创建内容。

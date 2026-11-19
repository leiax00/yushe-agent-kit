# Java / Maven 适配

## 版本号探测

- 多模块 reactor：聚合根 `pom.xml` 的项目 `<version>` 即应用线版本（正常情况父子一致）。
- 库 / 框架独立版本线的仓库：先确认哪些模块跟随聚合版本、哪些自成一线（看父 POM 指向与仓库规范），分别探测。
- 注意 `SNAPSHOT`：开发期常见 `<下一版本>-SNAPSHOT`，发布时冻结为正式版；发布后开启下一轮开发时升回 SNAPSHOT。仓库规范有明确约定的以其为准。

## 统一升版

在**聚合根**（含 `<modules>` 的 pom 所在目录）执行：

```bash
mvn versions:set -DnewVersion=X.Y.Z -DgenerateBackupPoms=false
```

- 一次更新父聚合与所有子模块的版本及 parent 引用，不逐文件手改。
- `-DgenerateBackupPoms=false` 避免 `pom.xml.backup` 残留。
- **双版本线仓库**：`versions:set` 会把整个 reactor 统一成新版本，本应保持独立的库 / 框架模块用 `git checkout -- <库目录>` 还原；库线升版在其自身聚合根单独执行同样的命令，并同步消费方 BOM 中的 pin 属性。
- 已采用 `revision` 属性 + flatten 插件方案的仓库，只改根 pom 的 `<revision>` 属性，其余遵循该仓库既有约定。
- 完整性验证：`mvn -B -f <聚合pom> test-compile` 确认 reactor 无字面量旧版本残留导致的解析失败。

## 渠道发布

- 私服（Nexus / Artifactory）：`mvn deploy`（`distributionManagement` 已配置时）。
- Maven Central：central-publishing 插件或门户上传；签名与坐标要求以仓库既有配置为准。
- SNAPSHOT 不得作为发布版本 deploy 到 release 仓库。

## 边界

- 测试门禁在发布操作的通用前置检查里执行，本参考只管版本落位与渠道。

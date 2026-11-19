# Python 适配

## 版本号探测（按序取先命中者）

1. `pyproject.toml` 声明 `dynamic = ["version"]` 时，`src/**/__init__.py`（或构建工具配置指向的位置）的 `__version__` 是**唯一事实来源**，只改这里，不动 pyproject。
2. 未用 dynamic 时，`pyproject.toml` `[project]` 的 `version =` 是事实来源。

## 统一升版（优先用项目工具，不手改）

- **uv**：`uv version X.Y.Z`（或 `uv version --bump patch|minor|major`），更新 `pyproject.toml` 并同步刷新 `uv.lock`。
- **hatch**：`hatch version major|minor|patch`。
- **pdm**：版本步进依赖 `pdm-bump` 插件，未安装则手改事实来源。
- 项目里 uv / hatch 都不存在时手改事实来源，`pip install -e .` 验证元数据可解析。
- 双事实来源陷阱：`dynamic` 与静态 `version` 并存或迁移残留时，只认探测顺序命中的那处，另一处同步清理，不两处各写一份。

## 渠道发布

- uv：`uv build && uv publish`。
- hatch / 通用：`hatch build` + `twine upload`，或走仓库既有 CI 发布通道。
- PyPI 不允许复用版本号（删除后同样不可复用）：发错版本优先 yank（已锁定依赖仍可解析）或尽快删除文件，修正靠发新 patch。
- 发布后 `pip index versions <pkg>` 或 PyPI 页面核验。

## 边界

- lint / 类型检查 / 测试门禁在发布操作的通用前置检查里执行，本参考只管版本落位与渠道。

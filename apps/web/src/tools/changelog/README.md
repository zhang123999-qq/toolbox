# Changelog 生成

按 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 格式，从「版本号 + 变更列表」生成一段
`CHANGELOG.md` 片段。

## 用途

发版时把一堆零散的 `git log` 整理成规范的 Added / Fixed / Changed 分段，省去手动归类。

## 输入

每行一条变更，格式 `类型: 描述`：

```text
feat: 新增批量导出
fix: 修复空状态错位
doc: 补充安装说明
```

| 字段   | 类型   | 约束             |
| ------ | ------ | ---------------- |
| `text` | string | 最大 20,000 字符 |

## 选项

| 选项 key  | 界面   | 说明           |
| --------- | ------ | -------------- |
| `version` | 版本号 | 本次发版版本号 |

## 类型 → 区段映射

| 输入类型          | 输出区段   |
| ----------------- | ---------- |
| `feat`            | Added      |
| `fix`             | Fixed      |
| `perf` / `change` | Changed    |
| `deprecate`       | Deprecated |
| `remove`          | Removed    |
| `security`        | Security   |
| `doc`             | Docs       |
| 其它 / 无类型     | Changed    |

## 数据流向

**纯本地处理。** 无网络请求。`meta.api = false`。

## 示例

输入：

```text
feat: 新增批量导出
fix: 修复空状态错位
```

版本号填 `1.2.0`，输出：

```text
## [1.2.0] - 2026-09-26

### Added
- 新增批量导出

### Fixed
- 修复空状态错位
```

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #265                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P2                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |

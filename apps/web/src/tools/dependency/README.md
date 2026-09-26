# 依赖分析

粘贴 `package.json`，离线统计依赖数量、`dependencies` / `devDependencies` 重复、
以及生产依赖的版本范围风险。

## 用途

- 快速看清生产依赖到底有多少个、用了多宽松的版本范围
- 找出同时写在 `dependencies` 与 `devDependencies` 里的包（应去重）
- 标出生产依赖里使用 `*` / `latest` 通配的项（不可复现构建）

## 输入

| 字段   | 类型   | 约束                                 |
| ------ | ------ | ------------------------------------ |
| `text` | string | package.json 原文，最大 200,000 字符 |

## 输出

| 项                                                | 说明                           |
| ------------------------------------------------- | ------------------------------ |
| 依赖总数（去重）                                  | 三类 dependencies 的并集大小   |
| dependencies / devDependencies / peerDependencies | 各自数量                       |
| 版本范围分布                                      | 精确 / `^` / `~` / `*` / 区间  |
| 重复依赖                                          | 同时出现在生产与开发依赖里的包 |
| 过时风险                                          | 生产依赖使用 `*` / `latest`    |

## 限制

- 只静态分析你粘贴的 `package.json`，**不联网**查 registry，不判断真实「过时」
- 不解析锁文件（`package-lock.json` / `pnpm-lock.yaml`）
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 无网络请求。`meta.api = false`。

## 示例

输入（节选）：

```json
{
  "dependencies": { "react": "^18.2.0", "chalk": "*" },
  "devDependencies": { "react": "^18.2.0" }
}
```

输出（节选）：

```text
依赖概览：
  依赖总数（去重）：2
  dependencies：2
  devDependencies：1
…
同时出现在 dependencies 与 devDependencies（建议去重）：
  - react
过时风险（生产依赖使用 * / latest，不可复现构建）：
  - chalk@*
```

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #262                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P2                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |

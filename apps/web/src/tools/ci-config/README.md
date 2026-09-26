# CI 配置

配置触发分支、Node 版本与流水线步骤，一键生成 `.github/workflows/ci.yml`。

## 用途

每次新建仓库都手写一遍 GitHub Actions YAML？选几个选项直接拿标准 CI 配置。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 输出

| 字段   | 类型   | 说明                             |
| ------ | ------ | -------------------------------- |
| `text` | string | 一段可粘贴的 GitHub Actions YAML |

## 选项

| 选项 key      | 界面标签  | 说明                              |
| ------------- | --------- | --------------------------------- |
| `branch`      | 触发分支  | push / PR 触发的分支，默认 `main` |
| `nodeVersion` | Node 版本 | 18 / 20 / 22                      |
| `install`     | 安装依赖  | 生成 `npm ci` 步骤                |
| `test`        | 跑测试    | 生成 `npm test` 步骤              |
| `build`       | 构建      | 生成 `npm run build` 步骤         |
| `deploy`      | 部署      | 生成 `npm run deploy` 步骤        |

## 限制

- 固定用 `ubuntu-latest`，不做矩阵 / 缓存 / 制品上传
- 包管理器写死 `npm`，不生成 pnpm / yarn 版本
- 部署步骤只是占位 `npm run deploy`，不接具体云厂商
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例

输出：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #257                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

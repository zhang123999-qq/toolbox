# GitLab CI

配置镜像、stages 与脚本步骤，一键生成 `.gitlab-ci.yml`。

## 用途

每次开新项目都手写一份 GitLab CI？填三个选项直接拿标准流水线文件。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 输出

| 字段   | 类型   | 说明                          |
| ------ | ------ | ----------------------------- |
| `text` | string | 一段可粘贴的 `.gitlab-ci.yml` |

## 选项

| 选项 key | 界面标签           | 说明                                |
| -------- | ------------------ | ----------------------------------- |
| `image`  | 镜像               | Docker 镜像，默认 `node:20`         |
| `stages` | stages(逗号分隔)   | 如 `build,test,deploy`              |
| `script` | 脚本步骤(每行一条) | 每行一条命令，生成在 `build_job` 里 |

## 限制

- 只生成单个 `build_job`，不展开每个 stage 一个 job
- 不生成 `only`/`rules`/`cache`/`artifacts` 等高级关键字
- 脚本命令不做转义
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例

输出：

```yaml
image: node:20

stages:
  - build
  - test
  - deploy

build_job:
  stage: build
  script:
    - npm ci
    - npm test
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #258                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

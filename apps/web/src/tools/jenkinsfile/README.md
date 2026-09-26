# Jenkinsfile

配置 agent / stages / post，一键生成声明式 Jenkinsfile。

## 用途

不用记声明式 Pipeline 的 Groovy 语法，填几个选项直接拿标准 Jenkinsfile。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 输出

| 字段   | 类型   | 说明                   |
| ------ | ------ | ---------------------- |
| `text` | string | 一段声明式 Jenkinsfile |

## 选项

| 选项 key | 界面标签         | 说明                                 |
| -------- | ---------------- | ------------------------------------ |
| `agent`  | Agent            | any / none                           |
| `stages` | stages(逗号分隔) | 如 `build,test,deploy`               |
| `post`   | post 块          | 勾选后追加 `post { always { ... } }` |

## 限制

- 每个 stage 只生成占位 `sh 'echo <stage>'`，不接具体构建命令
- 不生成 `environment` / `tools` / `options` / `when` 等块
- stages 名仅做字符校验
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例

输出：

```groovy
pipeline {
    agent any
    stages {
        stage('build') {
            steps {
                sh 'echo build'
            }
        }
        stage('test') {
            steps {
                sh 'echo test'
            }
        }
    }
    post {
        always {
            echo 'pipeline done'
        }
    }
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #259                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

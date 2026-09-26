# Helm 配置

生成一个 Helm Chart 的骨架：目录结构说明、`Chart.yaml`、`values.yaml`。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key      | 界面标签 | 默认      |
| ------------- | -------- | --------- |
| `chartName`   | Chart 名 | `mychart` |
| `version`     | 版本     | `0.1.0`   |
| `description` | 描述     | 英文占位  |

## 输出

```text
# 目录结构（在 charts/mychart/ 下）
mychart/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl
└── .helmignore

# ---- Chart.yaml ----
apiVersion: v2
name: mychart
...
```

## 限制

- 只给骨架文本，不真正写文件、不生成 templates 内的 .yaml
- 依赖（dependencies）、注解、ingress 等需自行补

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #222                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

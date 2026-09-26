# Terraform 配置

按云厂商与资源类型生成 `main.tf` + `variables.tf` + `outputs.tf` 骨架。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key   | 界面标签 | 取值                        |
| ---------- | -------- | --------------------------- |
| `provider` | 云厂商   | aws / azure / google        |
| `resource` | 资源类型 | compute / storage / network |

## 输出

三段拼接：`# ---- main.tf ----`（provider + resource）、`# ---- variables.tf ----`、`# ---- outputs.tf ----`。

## 限制

- 只是最小骨架：AMI、region、实例规格都是占位值，上线前必改
- 不含后端配置（S3 remote state）、data source、module

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #223                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

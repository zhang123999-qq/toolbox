# Docker Compose

按选项生成单服务的 `docker-compose.yml`。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key      | 界面标签 | 说明                               |
| ------------- | -------- | ---------------------------------- |
| `serviceName` | 服务名   | 默认 `app`                         |
| `image`       | 镜像     | 默认 `nginx:alpine`                |
| `ports`       | 端口映射 | 多个用逗号或换行分隔，如 `3000:80` |
| `environment` | 环境变量 | 每行一条 `KEY=VALUE`               |
| `volumes`     | 卷挂载   | 多个用逗号或换行分隔               |
| `dependsOn`   | 依赖服务 | 逗号分隔的服务名                   |

## 输出

```yaml
services:
  app:
    image: nginx:alpine
    ports:
      - '3000:80'
    environment:
      - DEBUG=true
    volumes:
      - ./data:/data
    depends_on:
      - db
```

## 限制

- 只生成单服务骨架；多服务编排、network、healthcheck、restart policy 需自行补
- 不做 YAML 合法性校验

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #220                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

# Docker 配置

按选项生成一个可直接使用的 Dockerfile 骨架。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key    | 界面标签 | 取值 / 默认                                         |
| ----------- | -------- | --------------------------------------------------- |
| `baseImage` | 基础镜像 | node / python / golang / openjdk                    |
| `version`   | 版本     | 留空用默认：node `20-alpine`、python `3.12-slim` 等 |
| `workdir`   | 工作目录 | 默认 `/app`                                         |
| `port`      | 暴露端口 | 默认 `3000`                                         |
| `command`   | 启动命令 | 留空按镜像给默认 CMD                                |

## 输出

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY . .

EXPOSE 3000

CMD node server.js
```

## 限制

- 只生成单阶段骨架，不含多阶段构建、健康检查、非 root 用户等生产加固
- 依赖安装（npm install / pip install）需自行补在 COPY 之后

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #219                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

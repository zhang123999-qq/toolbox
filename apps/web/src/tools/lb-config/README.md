# 负载均衡配置

配置后端服务器列表与调度算法，生成 Nginx `upstream` 或 HAProxy `backend` 配置。

## 用途

不用手敲 Nginx upstream 或 HAProxy backend 块，贴几行后端地址直接拿标准配置。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 输出

| 字段   | 类型   | 说明                                   |
| ------ | ------ | -------------------------------------- |
| `text` | string | Nginx upstream 或 HAProxy backend 配置 |

## 选项

| 选项 key      | 界面标签             | 说明                                     |
| ------------- | -------------------- | ---------------------------------------- |
| `type`        | 类型                 | nginx / haproxy                          |
| `servers`     | 后端服务器(每行一个) | 每行一个 `host:port`，如 `10.0.0.1:8080` |
| `algorithm`   | 调度算法             | round_robin / least_conn / ip_hash       |
| `healthCheck` | 健康检查             | 勾选后输出健康检查指令                   |

## 算法映射

| 选择        | Nginx            | HAProxy              |
| ----------- | ---------------- | -------------------- |
| round_robin | （默认，无指令） | `balance roundrobin` |
| least_conn  | `least_conn;`    | `balance leastconn`  |
| ip_hash     | `ip_hash;`       | `balance source`     |

## 限制

- 不生成权重、最大连接数、慢启动等高级参数
- 不接 SSL / 限流 / 缓存段
- 后端地址只做 `host:port` 格式校验
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例（Nginx）

```nginx
upstream backend {
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;
    health_check;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #256                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

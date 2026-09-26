# K8s 配置

按资源类型生成常用 Kubernetes YAML 清单。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key   | 界面标签 | 取值 / 默认                                      |
| ---------- | -------- | ------------------------------------------------ |
| `kind`     | 资源类型 | Deployment / Service / ConfigMap / Ingress / PVC |
| `name`     | 名称     | 默认 `app`                                       |
| `image`    | 镜像     | 默认 `nginx:alpine`（Deployment）                |
| `port`     | 端口     | 默认 `80`                                        |
| `replicas` | 副本数   | 默认 `1`（Deployment）                           |

## 输出示例（Deployment）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: nginx:alpine
          ports:
            - containerPort: 80
```

## 限制

- 只生成最小骨架：没有 readiness/liveness 探针、资源 requests/limits、HPA、滚动策略
- Ingress 的 host 写死 `example.local`，PVC 容量写死 `1Gi`，上线前自行调整
- 不做 schema 校验

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #221                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

# nginx 配置

生成一个可直接粘贴进 `sites-available/` 的 `server {}` 块。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key     | 界面标签   | 默认 / 说明                             |
| ------------ | ---------- | --------------------------------------- |
| `serverName` | 域名       | `example.com`                           |
| `listen`     | 监听端口   | 默认 `80`，勾选 SSL 后默认 `443 ssl`    |
| `root`       | 站点根目录 | 默认 `/usr/share/nginx/html`            |
| `proxyPass`  | 反向代理到 | 填了就走 `location /` 反代，不再写 root |
| `ssl`        | 启用 SSL   | 追加证书路径与 443                      |
| `gzip`       | 启用 gzip  | 追加 gzip_types                         |

## 输出

```nginx
server {
    listen 80;
    server_name example.com;

    root /usr/share/nginx/html;
    index index.html;
}
```

## 限制

- 只生成单个 server 块，不做 80→443 跳转的两个 server
- 证书路径写死 `/etc/nginx/ssl/`，上线前替换
- 不做 fastcgi/uwsgi/静态缓存头等进阶配置

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #225                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

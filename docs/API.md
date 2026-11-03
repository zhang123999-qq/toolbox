# Toolbox API Reference

> **中文** | [English](API.en.md)

> 本文档描述 Toolbox 静态站的**对外接口**：`toolboxctl` 管理 CLI 与 `/healthz` HTTP 健康检查端点。
> 本项目为纯前端静态站点，不提供传统的 REST / GraphQL API。

---

## 目录

1. [toolboxctl CLI](#1-toolboxctl-cli)
2. [/healthz HTTP 端点](#2-healthz-http-端点)
3. [nginx 配置模板变量](#3-nginx-配置模板变量)
4. [环境变量速查](#4-环境变量速查)

---

## 1. toolboxctl CLI

### 1.1 概览

`toolboxctl` 是随部署包分发的管理 CLI，安装后全局可用（`/usr/local/bin/toolboxctl`）。纯 POSIX `sh` 编写，目标机仅需 `sh`、`tar`、`systemd`、`nginx`。

**设计原则**：

- 所有子命令统一支持 `--prefix`（实例根目录），且传参必生效
- 真正的落地逻辑集中于此，`install.sh` 仅负责下载/校验/解包后调用 `toolboxctl install`
- 目录布局：`<prefix>/releases/<ver>/` 不可变版本、`<prefix>/current -> …` 原子软链、`<prefix>/shared/` 跨版本共享状态
- 运行独立 nginx 实例（自带 pid/日志/临时目录/MIME 表），只用系统 nginx 二进制，不读 `/etc/nginx`

### 1.2 全局选项

| 选项           | 说明                             | 默认值         |
| -------------- | -------------------------------- | -------------- |
| `--prefix DIR` | 站点安装根目录（所有子命令通用） | `/opt/toolbox` |

> 必须为绝对路径。多实例时注意 systemd unit 名固定为 `toolbox.service`，一台机器仅支持一个受管服务实例。

### 1.3 子命令完整参考

#### 安装 / 卸载

| 命令        | 参数                                                                                                                             | 说明                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `install`   | `--from <tar.gz\|dir\|url>`<br>`--port N`<br>`--prefix DIR`<br>`--nginx-user U`<br>`--install-deps`<br>`--no-start`<br>`--force` | 从 bundle 部署。`--port` 默认 8081；`--install-deps` 自动 `apt-get install nginx`；`--force` 覆盖同版本               |
| `uninstall` | `--purge`<br>`--purge-deps`<br>`--keep-user`                                                                                     | 停服务、摘配置。`--purge` 全清（含 `/opt/toolbox` 与 `/etc/toolbox`）；`--purge-deps` 连同本工具安装的 nginx 一起卸载 |

#### 日常运维

| 命令                                       | 参数                                                                                          | 说明                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `status`                                   | 无                                                                                            | 服务/版本/端口/健康一览                                                 |
| `start` \| `stop` \| `restart` \| `reload` | 无                                                                                            | systemd 服务控制；`start`/`restart` 后轮询确认版本                      |
| `health`                                   | 无                                                                                            | 探测 `/healthz` 并打印版本（等待至版本一致）                            |
| `logs`                                     | `-n N`（默认 50）<br>`-f` \| `--follow`                                                       | 查看 journal + nginx error/access 日志                                  |
| `config`                                   | 无                                                                                            | 打印当前生效配置（`/etc/toolbox/toolbox.conf` + 渲染后的 nginx 主配置） |
| `list`                                     | 无                                                                                            | 列出已安装版本（* 标记当前）                                            |
| `backup`                                   | `--output DIR`（默认 `/var/backups/toolbox`）                                                 | 备份配置与共享状态为 `toolbox-backup-<timestamp>.tar.gz`                |
| `doctor`                                   | 无                                                                                            | 环境自检：依赖/端口/磁盘/权限/服务/配置/升级源                          |
| `version`                                  | 无                                                                                            | 显示 CLI 版本与已安装版本                                               |
| `render`                                   | `--tpl-dir D`<br>`--out D`<br>`--prefix P`<br>`--port N`<br>`--nginx-user U`<br>`--version V` | 仅渲染配置模板（CI/容器验证 nginx 配置用），不做安装                    |

#### 在线升级

| 命令           | 参数                                                                  | 说明                                                                                                   |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `check-update` | `--source <dir\|url>`                                                 | 查询可升级版本；输出当前版本、源内最新版本、建议动作                                                   |
| `upgrade`      | `--source <dir\|url>`<br>`--to VERSION`<br>`--force`<br>`--no-reload` | **检测不到更高版本时跳过本次更新**（不改动实例）；只有显式 `--to` 才允许同版本重装或降级；失败自动回滚 |
| `rollback`     | `--to VERSION`                                                        | 回滚到历史版本；省略 `--to` 时用上一版本记录，无记录则取当前之外的最大版本                             |

### 1.4 升级源解析

`--source` 可为本地目录或 HTTP 基址，目录内需包含：

- `latest.txt`：最新版本号
- `toolbox-<ver>-linux-<arch>.tar.gz` 及其 `.sha256`

优先级：`--source` > 配置文件 `UPDATE_SOURCE` > 内建默认值
`https://github.com/zhang123999-qq/toolbox/releases/latest/download`

### 1.5 配置文件

路径：`/etc/toolbox/toolbox.conf`（由 `toolboxctl` 维护，可手工微调后 `reload`）

```ini
# Toolbox 运行配置（由 toolboxctl 维护，可手工微调后 reload）
PREFIX='/opt/toolbox'
PORT='8081'
NGINX_USER='toolbox'
NGINX_BIN='/usr/sbin/nginx'
UPDATE_SOURCE='https://github.com/zhang123999-qq/toolbox/releases/latest/download'
SERVICE_NAME='toolbox'
INSTALLED_AT='2026-10-22T14:30:00+08:00'
```

### 1.6 目录布局

```
/opt/toolbox/
├── current -> releases/0.0.6          # 原子软链，唯一切换点
├── releases/
│   └── 0.0.6/                         # 不可变版本目录
│       ├── app/                       # 静态产物（html/js/css/wasm）
│       ├── bin/toolboxctl             # 管理 CLI
│       ├── conf/                      # nginx.conf.tpl / toolbox.service.tpl / mime.types
│       ├── VERSION                    # 版本号
│       ├── manifest.json              # 版本 + git commit
│       └── checksums.txt              # 逐文件 sha256
├── shared/
│   ├── nginx.conf                     # 渲染后的 nginx 主配置
│   ├── toolbox.service                # 渲染后的 systemd unit
│   └── state/                         # 运行时状态（installed/previous 等）
├── logs/                              # nginx error.log / access.log
└── run/                               # nginx.pid / 临时目录
```

---

## 2. /healthz HTTP 端点

### 2.1 概览

- **路径**：`GET /healthz`
- **部署**：nginx 配置中通过 `return 200 "ok v<VERSION>\n"` 直接响应，无后端进程
- **用途**：安装/升级/回滚流程据此判定「切换是否成功」；`toolboxctl health` / `status` / `upgrade` / `rollback` 均轮询此端点

### 2.2 请求示例

```bash
curl -fsS http://127.0.0.1:8081/healthz
```

### 2.3 响应

| 字段          | 说明                                                 |
| ------------- | ---------------------------------------------------- |
| HTTP 状态码   | `200 OK`                                             |
| Content-Type  | `text/plain`                                         |
| Cache-Control | `no-store`                                           |
| 响应体        | `ok v0.0.6`（版本号与 `deploy/binary/VERSION` 一致） |

### 2.4 语义

| 响应             | 含义                                               |
| ---------------- | -------------------------------------------------- |
| `ok v<当前版本>` | 服务正常，且运行版本与 `current` 指向一致          |
| `ok v<旧版本>`   | 服务正常，但 nginx 尚未重载（`reload` 后异步生效） |
| 无响应 / 非 200  | 服务异常或端口未监听                               |

> **注意**：`toolboxctl` 的健康检查会**显式绕过代理**（`curl --noproxy '*'`），避免安装脚本的 `--proxy` 导致本机回环探测被发给代理服务器。

---

## 3. nginx 配置模板变量

`toolboxctl` 从 `conf/nginx.conf.tpl` 渲染生成最终配置，以下为模板变量：

| 变量            | 来源                                             | 说明                                                                                                   |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `@PREFIX@`      | `PREFIX`（默认 `/opt/toolbox`）                  | 站点安装根目录                                                                                         |
| `@PORT@`        | `PORT`（默认 `8081`）                            | 监听端口                                                                                               |
| `@VERSION@`     | `current` 指向的版本号                           | 写入 `/healthz` 响应体                                                                                 |
| `@NGINX_BIN@`   | 自动探测或配置文件                               | nginx 可执行文件路径                                                                                   |
| `@NGINX_USER@`  | `NGINX_USER`（默认 `toolbox`）                   | worker 进程用户                                                                                        |
| `@NGINX_GROUP@` | 自动探测（`nobody`/`nogroup`）                   | worker 进程组，**必须显式给出**，否则 Debian/Ubuntu 上 `user nobody;` 会报 `getgrnam("nobody") failed` |
| `@DOC_URL@`     | 固定 `https://github.com/zhang123999-qq/toolbox` | systemd unit Documentation 字段                                                                        |

### 3.1 关键配置片段

**独立实例隔离**：

```nginx
pid               @PREFIX@/run/nginx.pid;
error_log         @PREFIX@/logs/error.log warn;
user              @NGINX_USER@ @NGINX_GROUP@;

client_body_temp_path  @PREFIX@/run/client_temp;
proxy_temp_path        @PREFIX@/run/proxy_temp;
fastcgi_temp_path      @PREFIX@/run/fastcgi_temp;
uwsgi_temp_path        @PREFIX@/run/uwsgi_temp;
scgi_temp_path         @PREFIX@/run/scgi_temp;
```

**安全响应头**（直接生效）：

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**CSP 观察版**（Report-Only，不强制）：

```nginx
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
```

**静态资源长缓存**：

```nginx
location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
location /wasm/   { expires 30d; add_header Cache-Control "public, immutable"; }
```

**真正的 404**（避免软 404 污染搜索索引）：

```nginx
error_page 404 /404.html;
location = /404.html { internal; add_header Cache-Control "no-cache"; }
location / { try_files $uri $uri/index.html =404; }
```

---

## 4. 环境变量速查

以下变量可在安装/升级/运行时通过环境变量传入（同名 CLI 参数优先级更高）：

| 变量                    | 适用阶段                         | 说明                                      | 默认值                                |
| ----------------------- | -------------------------------- | ----------------------------------------- | ------------------------------------- |
| `TOOLBOX_PORT`          | install / upgrade / render       | 站点监听端口                              | `8081`                                |
| `UPDATE_SOURCE`         | upgrade / check-update           | 升级源基址                                | GitHub Releases latest/download       |
| `GITHUB_TOKEN`          | install (GitHub Release 下载)    | 访问私有仓库 Release 所需                 | —                                     |
| `TOOLBOX_REPO`          | install (GitHub Release 下载)    | 覆盖仓库（默认 `zhang123999-qq/toolbox`） | —                                     |
| `TOOLBOX_PROXY`         | install / upgrade (下载阶段)     | 下载走的 HTTP 代理                        | —                                     |
| `COREPACK_NPM_REGISTRY` | Docker build                     | corepack 下载 pnpm 的镜像源               | `https://registry.npmmirror.com`      |
| `SITE_ORIGIN`           | build (sitemap/robots/canonical) | 站点绝对地址                              | `packages/catalog/src/site.ts` 内置值 |

> ⚠️ 密钥类变量（如 `GITHUB_TOKEN`、`TOOLBOX_AI_API_KEY` 等）**严禁**使用 `VITE_` 前缀，否则会被 Vite 内联进浏览器产物。

---

## 5. 版本号落点（五处必须一致）

| 落点                      | 示例                               | 由谁写入             | 用途                             |
| ------------------------- | ---------------------------------- | -------------------- | -------------------------------- |
| `deploy/binary/VERSION`   | `0.0.6`                            | 手工（真源）         | 打包与 CLI 版本号的唯一来源      |
| bundle 文件名             | `toolbox-0.0.6-linux-amd64.tar.gz` | `build-bundle.sh`    | 用户可见、升级源按名解析版本     |
| bundle 内 `VERSION`       | `0.0.6`                            | `build-bundle.sh`    | 安装时校验「包内版本」           |
| bundle 内 `manifest.json` | `"version": "0.0.6"`               | `build-bundle.sh`    | 追溯「这个包出自哪个提交」       |
| git tag / Release         | `v0.0.6`                           | `gh release create`  | 与源码历史绑定                   |
| `/healthz` 响应           | `ok v0.0.6`                        | nginx 配置渲染期写死 | 证明「当前真正在跑的是哪个版本」 |

---

## 6. 验证示例

### 6.1 安装后验证

```bash
# 1. 查看状态
toolboxctl status
# 输出示例：
# 服务名称 : toolbox (toolbox.service)
# 服务状态 : active
# 已装版本 : 0.0.6
# 安装目录 : /opt/toolbox
# 监听端口 : 8081
# 运行用户 : toolbox (worker)
# 访问地址 : http://192.168.1.100:8081/
# 健康检查 : 通过 (ok v0.0.6)
# 版本一致 : ✓ 服务端运行的正是 current 指向的 0.0.6
# 已装版本集 : 0.0.6

# 2. 环境自检
toolboxctl doctor

# 3. 直接探测健康端点
curl -fsS http://127.0.0.1:8081/healthz
# 输出：ok v0.0.6
```

### 6.2 升级与回滚验证

```bash
# 查询可用更新
toolboxctl check-update
# 输出示例：
# 升级源       : https://github.com/zhang123999-qq/toolbox/releases/latest/download (url)
# 当前版本     : 0.0.6
# 源内最新版本 : 0.0.7
# → 有新版本可升级：0.0.6 → 0.0.7
#   执行：toolboxctl upgrade --source https://github.com/zhang123999-qq/toolbox/releases/latest/download

# 执行升级
toolboxctl upgrade

# 回滚上一版本
toolboxctl rollback

# 指定版本回滚
toolboxctl rollback --to 0.0.5
```

### 6.3 配置渲染验证（CI/容器）

```bash
# 仅渲染配置，不安装
toolboxctl render --prefix /opt/toolbox --port 8081 --version 0.0.6 --out /tmp/rendered

# 验证 nginx 语法
nginx -t -c /tmp/rendered/nginx.conf
```

---

## 7. 相关文档

| 需求                             | 文档                               |
| -------------------------------- | ---------------------------------- |
| 完整部署流程、基础设施、回滚指南 | [`DEPLOYMENT.md`](DEPLOYMENT.md)   |
| 发布流程、版本管理               | [`RELEASE.md`](RELEASE.md)         |
| 变更历史                         | [`CHANGELOG.md`](../CHANGELOG.md)  |
| 开发指南、新增工具流程           | [`DEVELOPMENT.md`](DEVELOPMENT.md) |

---

_本文档随代码同步更新，版本：v2.0 · 2026-10-24_

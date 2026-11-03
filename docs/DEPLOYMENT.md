# Toolbox 部署指南

> **中文** | [English](DEPLOYMENT.en.md)

> 本文档涵盖生产环境部署的完整流程：基础设施准备、三条部署链路、环境变量字典、升级/回滚操作、排障清单。

---

## 目录

1. [目标机要求](#1-目标机要求)
2. [三条部署链路](#2-三条部署链路)
3. [目录布局与独立实例隔离](#3-目录布局与独立实例隔离)
4. [环境变量字典](#4-环境变量字典)
5. [升级与回滚操作手册](#5-升级与回滚操作手册)
6. [自建/内网发布源](#6-自建内网发布源)
7. [容器化部署](#7-容器化部署)
8. [排障清单](#8-排障清单)
9. [安全基线](#9-安全基线)

---

## 1. 目标机要求

### 1.1 二进制部署（推荐用于 Linux 服务器）

| 项目       | 要求                                                          |
| ---------- | ------------------------------------------------------------- |
| 操作系统   | Linux x86_64 / aarch64                                        |
| init 系统  | systemd（`/run/systemd/system` 必须存在）                     |
| Web 服务器 | nginx ≥ 1.21（可用 `--install-deps` 自动安装）                |
| 基线命令   | `sh` `tar` `gzip` `sha256sum` `awk` `sed` `curl`（或 `wget`） |
| 权限       | root（安装、卸载、服务管理、写 `/opt`、装 systemd unit）      |
| 磁盘       | ≈ 50 MB（`/opt/toolbox`，含新旧两个版本的冗余）               |
| 网络       | 仅在线安装/升级需 `curl`/`wget`；离线可用本地目录作源         |

> **不需要**：Go、Node.js、pnpm、Docker、Python

### 1.2 容器部署

| 项目     | 要求                           |
| -------- | ------------------------------ |
| 运行时   | Docker ≥ 24 / Podman           |
| 架构     | linux/amd64、linux/arm64       |
| 端口映射 | 宿主端口 → 容器内 8081（固定） |

---

## 2. 三条部署链路

按目标机环境任选一条。

### 2.1 链路 ①：二进制部署（推荐，生产首选）

**目标机仅需 `sh` + `tar` + `systemd` + `nginx`，无需任何构建工具链。**

#### 一键安装（GitHub Release 源，推荐入口）

```bash
# 先审阅脚本再执行（安全建议）
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | less

# 确认无误后执行
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash
```

> 🔒 **安全提示**：`curl … | bash` 等于把远程脚本直接交给 shell。建议先下载审阅，或使用 `--dry-run` 预览。

#### 常用变体

| 需求                | 命令    |
| ------------------- | ------- |
| 换端口（默认 8081） | `curl … | sudo bash -s -- --port 9090`                    |
| 自动安装 nginx      | `curl … | sudo bash -s -- --install-deps`                 |
| 指定版本            | `curl … | sudo bash -s -- --version 0.0.6`                |
| 先预览（不落地）    | `curl … | sudo bash -s -- --dry-run`                      |
| 国内网络走代理      | `curl … | sudo bash -s -- --proxy http://127.0.0.1:10808` |
| 使用加速镜像        | `curl … | sudo bash -s -- --mirror https://ghfast.top`    |
| 仅落地不启动        | `curl … | sudo bash -s -- --no-start`                     |

#### 手动安装（已下载 bundle 到本地）

```bash
tar -xzf toolbox-0.0.6-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.6-linux-amd64.tar.gz --install-deps
```

### 2.2 链路 ②：容器部署

```bash
# 构建镜像（多阶段：Node 24 构建 → nginx 静态托管）
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .

# 运行（容器内外都是 8081）
docker run -d --name toolbox-web -p 8081:8081 toolbox-web:dev

# 生产建议：固定版本标签、配置重启策略、挂载日志目录
docker run -d \
  --name toolbox-web \
  --restart unless-stopped \
  -p 8081:8081 \
  -v /var/log/toolbox:/opt/toolbox/logs \
  toolbox-web:0.0.6
```

> 容器形态的容器内端口**固定为 8081**；改对外端口请用 `-p <宿主端口>:8081`。

### 2.3 链路 ③：本地开发

```bash
# 1. 装依赖（Windows 沙箱下 esbuild postinstall 会 EBUSY，加 --ignore-scripts）
pnpm install --ignore-scripts

# 2. 启动开发服务器（默认 http://localhost:5173）
pnpm dev

# 3. 元数据校验
pnpm check:tools

# 4. 构建 + SSR + 预渲染全部静态页（CI 完整产物）
pnpm build:ssg
```

> Windows 沙箱下 `pnpm dev` 若报 `os error 231`，加 `--concurrency=1`。

---

## 3. 目录布局与独立实例隔离

### 3.1 安装后目录结构

```
/opt/toolbox/
├── current -> releases/0.0.6          # 原子软链，唯一切换点
├── releases/
│   └── 0.0.6/                         # 不可变版本目录（解包即用）
│       ├── app/                       # 静态产物：html/js/css/wasm/…
│       ├── bin/toolboxctl             # 管理 CLI
│       ├── conf/                      # 模板：nginx.conf.tpl / toolbox.service.tpl / mime.types
│       ├── VERSION                    # 版本号（如 0.0.6）
│       ├── manifest.json              # {"version":"0.0.6","gitCommit":"abc123"}
│       └── checksums.txt              # 逐文件 sha256
├── shared/                            # 跨版本共享状态
│   ├── nginx.conf                     # 渲染后的 nginx 主配置
│   ├── toolbox.service                # 渲染后的 systemd unit
│   └── state/                         # 运行时状态
│       ├── installed                  # 当前版本
│       └── previous                   # 上一版本（供 rollback 使用）
├── logs/                              # nginx error.log / access.log
└── run/                               # nginx.pid / 临时目录
```

### 3.2 独立 nginx 实例隔离

- **只用系统 nginx 二进制**（`/usr/sbin/nginx` 等），完全不读 `/etc/nginx`
- 自带 `pid`、`error_log`、临时目录、MIME 表
- `toolboxctl start/stop/restart/reload` 只影响本站点
- 卸载不会影响同机其它 nginx 站点
- systemd unit 名固定为 `toolbox.service`，**一台机器仅支持一个受管实例**

---

## 4. 环境变量字典

以下变量可在安装/升级/运行时通过环境变量传入（同名 CLI 参数优先级更高）。

### 4.1 安装/升级/运行通用

| 变量                    | 适用阶段                   | 说明                                      | 默认值                           | 示例                                                   |
| ----------------------- | -------------------------- | ----------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| `TOOLBOX_PORT`          | install / upgrade / render | 站点监听端口                              | `8081`                           | `TOOLBOX_PORT=9090`                                    |
| `UPDATE_SOURCE`         | upgrade / check-update     | 升级源基址                                | GitHub Releases latest/download  | `UPDATE_SOURCE=http://mirror.internal/releases`        |
| `GITHUB_TOKEN`          | install (GitHub Release)   | 访问私有仓库 Release 所需                 | —                                | `GITHUB_TOKEN=ghp_xxx`                                 |
| `TOOLBOX_REPO`          | install (GitHub Release)   | 覆盖仓库（默认 `zhang123999-qq/toolbox`） | —                                | `TOOLBOX_REPO=myorg/toolbox`                           |
| `TOOLBOX_PROXY`         | install / upgrade (下载)   | 下载走的 HTTP 代理                        | —                                | `TOOLBOX_PROXY=http://127.0.0.1:10808`                 |
| `COREPACK_NPM_REGISTRY` | Docker build               | corepack 下载 pnpm 的镜像源               | `https://registry.npmmirror.com` | `COREPACK_NPM_REGISTRY=https://registry.npmmirror.com` |
| `SITE_ORIGIN`           | build (sitemap/canonical)  | 站点绝对地址                              | 内置值                           | `SITE_ORIGIN=https://tools.example.com`                |

### 4.2 构建时/运行时（工具类）

> 完整列表见 [`.env.example`](../.env.example) 与 [`docs/DEVELOPMENT.md §8.5`](DEVELOPMENT.md#85-外部-api-配置硬约束)

| 变量                            | 用途                              | 是否密钥 | VITE_ 前缀 |
| ------------------------------- | --------------------------------- | -------- | ---------- |
| `VITE_TOOLBOX_AI_API_BASE`      | OpenAI 兼容 chat completions 端点 | 否       | ✅ 允许    |
| `VITE_TOOLBOX_AI_MODEL`         | 默认模型名                        | 否       | ✅ 允许    |
| `TOOLBOX_AI_API_KEY`            | 自建代理服务端注入的密钥          | **是**   | ❌ 禁止    |
| `TOOLBOX_EXCHANGE_RATE_API_KEY` | exchangerate.host access_key      | **是**   | ❌ 禁止    |

> ⚠️ **红线**：密钥类变量**严禁**使用 `VITE_` 前缀，否则会被 Vite 内联进浏览器产物，任何人查看 `dist/*.js` 都能读到。

### 4.3 优先级顺序

```
CLI 参数 > 已装实例配置文件 > 环境变量 > 内建默认值
```

示例（`--port`）：

```
toolboxctl install --port 9090        # 最高
/etc/toolbox/toolbox.conf 中的 PORT   # 次之
TOOLBOX_PORT=9090                     # 再次之
默认 8081                             # 兜底
```

---

## 5. 升级与回滚操作手册

### 5.1 升级流程

```bash
# 1. 查询可用更新
toolboxctl check-update
# 输出示例：
# 升级源       : https://github.com/zhang123999-qq/toolbox/releases/latest/download (url)
# 当前版本     : 0.0.6
# 源内最新版本 : 0.0.7
# → 有新版本可升级：0.0.6 → 0.0.7
#   执行：toolboxctl upgrade --source https://github.com/zhang123999-qq/toolbox/releases/latest/download

# 2. 执行升级（默认从配置文件 UPDATE_SOURCE 或内建默认源）
toolboxctl upgrade

# 3. 指定版本升级（允许同版本重装、也允许有意降级）
toolboxctl upgrade --to 0.0.7

# 4. 强制重装当前版本（修复损坏配置、重建实例）
toolboxctl upgrade --to 0.0.6 --force

# 5. 仅切软链不重载（CI/蓝绿部署预检）
toolboxctl upgrade --no-reload
```

#### 升级关键行为

| 场景                                     | 行为                                                             |
| ---------------------------------------- | ---------------------------------------------------------------- |
| 源内版本 = 当前版本                      | **跳过本次更新**，提示 `已是最新 ✅`                             |
| 源内版本 < 当前版本（镜像站过期/回退源） | **跳过本次更新**，提示疑似回退源，给出 `rollback`/`--force` 指引 |
| 显式 `--to` 指定版本                     | 允许同版本重装、允许降级                                         |
| 升级后健康检查失败（15s 未确认新版本）   | **自动回滚**到上一版本，报错并保留日志                           |
| 配置语法校验失败                         | 自动回滚，不重载 nginx                                           |

### 5.2 回滚流程

```bash
# 1. 回滚到上一版本（用安装/升级时记录的 previous）
toolboxctl rollback

# 2. 指定版本回滚
toolboxctl rollback --to 0.0.5

# 3. 无记录时的兜底：取当前之外的最大版本
toolboxctl rollback  # 当 previous 不存在时自动选最大历史版本
```

#### 回滚关键行为

- 切 `current` 软链 → 重渲染配置 → `systemctl reload` → 轮询确认版本
- 回滚后健康检查失败会报警但**不再二次回滚**（避免震荡）
- `toolboxctl status` 可随时核对 `版本一致` 字段

### 5.3 手动干预回滚（极端情况）

若 `toolboxctl` 自身损坏或 systemd 异常：

```bash
# 1. 直接切软链
ln -sfn releases/0.0.5 /opt/toolbox/current

# 2. 重渲染配置（用旧版本的 toolboxctl）
/opt/toolbox/releases/0.0.5/bin/toolboxctl render --prefix /opt/toolbox --out /opt/toolbox/shared

# 3. 重载 nginx
systemctl reload toolbox.service

# 4. 验证
curl -fsS http://127.0.0.1:8081/healthz
```

---

## 6. 自建/内网发布源

生产环境推荐：不依赖 GitHub 可达性，顺带解决内网机器无外网的问题。

### 6.1 发布源目录结构

```
<发布源根目录>/
├── latest.txt                              # 单行版本号，如 0.0.6
├── index.json                              # 版本索引（版本/文件名/sha256）
├── install.sh                              # 一键安装脚本
├── toolbox-0.0.6-linux-amd64.tar.gz        # 部署包
├── toolbox-0.0.6-linux-amd64.tar.gz.sha256 # 整包校验
├── toolbox-0.0.6-linux-arm64.tar.gz
└── toolbox-0.0.6-linux-arm64.tar.gz.sha256
```

### 6.2 搭建发布源（任选其一）

```bash
# A. 简单 HTTP 服务（已有构建产物的机器上）
cd dist-release && python3 -m http.server 8899

# B. nginx 托管同一目录
# server { root /path/to/dist-release; autoindex on; }

# C. S3 / OSS / 任意静态文件服务
```

### 6.3 目标机从自建源安装

```bash
# 一行装完
curl -fsSL http://<发布源IP>:8899/install.sh | sudo bash -s -- --source http://<发布源IP>:8899

# 或配置永久生效（写入 /etc/toolbox/toolbox.conf）
echo "UPDATE_SOURCE='http://<发布源IP>:8899'" | sudo tee -a /etc/toolbox/toolbox.conf
toolboxctl install  # 无需再传 --source
```

### 6.4 目标机从自建源升级

```bash
toolboxctl upgrade --source http://<发布源IP>:8899
# 或配置 UPDATE_SOURCE 后直接
toolboxctl upgrade
```

> 发布源目录内**必须**有 `latest.txt` 与对应架构的 `.tar.gz` + `.sha256`，否则 `check-update`/`upgrade` 会报错。

---

## 7. 容器化部署

### 7.1 Dockerfile 关键点（`deploy/docker/Dockerfile`）

- 多阶段构建：Node 24 (alpine) 构建 → nginx:1.27-alpine 运行
- 构建期注入 `SITE_ORIGIN`、`VERSION`，渲染 nginx 配置与 `/healthz`
- 容器内固定监听 8081，`EXPOSE 8081`，`HEALTHCHECK` 探测 `/healthz`
- `COREPACK_NPM_REGISTRY` 默认指向 npmmirror，国内网络可覆盖 `--build-arg`
- 基础镜像可用 `--build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:24-alpine` 切国内源

### 7.2 构建与运行

```bash
# 构建（指定版本标签）
docker build \
  -f deploy/docker/Dockerfile \
  -t toolbox-web:0.0.6 \
  --build-arg SITE_ORIGIN=https://tools.example.com \
  --build-arg VERSION=0.0.6 \
  .

# 运行（生产建议）
docker run -d \
  --name toolbox-web \
  --restart unless-stopped \
  -p 8081:8081 \
  -v /var/log/toolbox:/opt/toolbox/logs \
  toolbox-web:0.0.6

# 验证
docker exec toolbox-web wget -qO- http://127.0.0.1:8081/healthz
# 输出：ok v0.0.6
```

### 7.3 Docker Compose（`deploy/docker/docker-compose.dev.yml`）

```yaml
services:
  web:
    build:
      context: .
      dockerfile: deploy/docker/Dockerfile
    ports:
      - '8081:8081'
    volumes:
      - ./logs:/opt/toolbox/logs
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:8081/healthz']
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 8. 排障清单

### 8.1 安装阶段

| 症状                      | 排查步骤                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `curl                     | bash` 报错「安装失败」                                                                                 | 1. 先 `curl …                                | less`审阅脚本<br>2. 加`--dry-run`预览动作<br>3. 查看上方输出定位`toolboxctl` 返回的非 0 原因 |
| 「未找到 nginx」          | 加 `--install-deps` 自动装，或手动 `apt-get install -y nginx`                                          |
| 「端口 8081 已被占用」    | `ss -lntp                                                                                              | grep :8081`确认占用者；换`--port` 或释放端口 |
| 带 `--proxy` 安装必失败   | **已知问题**：健康检查被代理劫持。`toolboxctl` 已修复（显式 `--noproxy '*'`），确保用最新 `install.sh` |
| 「sha256 校验失败」       | 包损坏或被篡改；检查网络/代理是否返回了错误页而非部署包                                                |
| `install.sh` 吞掉落地失败 | **已知问题**：旧版 `install.sh` 无 `set -e`。确保用 Release 附件里的最新版                             |

### 8.2 运行阶段

| 症状                                                   | 排查步骤                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toolboxctl status` 显示「健康检查：失败」             | 1. `toolboxctl logs -n 50` 看 nginx 错误日志<br>2. `systemctl status toolbox.service` 确认服务 active<br>3. `curl -fsS http://127.0.0.1:8081/healthz` 直探 |
| 「版本一致：✗ 服务端报告 v0.0.5，current 指向 v0.0.6」 | nginx 尚未重载；执行 `toolboxctl reload` 或等待异步生效                                                                                                    |
| 全站 403                                               | 权限问题：`chmod -R u=rwX,go=rX /opt/toolbox/releases/<版本>`（nginx worker 需读权限）                                                                     |
| 访问返回 200 但内容是首页（软 404）                    | nginx 配置未生效；检查 `toolboxctl config` 与 `nginx -t`                                                                                                   |
| WASM 加载失败（MIME 类型错误）                         | 确认 nginx 配置包含 `application/wasm`；`toolboxctl config` 核对                                                                                           |
| 搜索搜不到新工具                                       | 执行 `pnpm generate:catalog` 重建索引（catalog 与搜索索引同源）                                                                                            |

### 8.3 升级/回滚阶段

| 症状                                    | 排查步骤                                                         |
| --------------------------------------- | ---------------------------------------------------------------- |
| `upgrade` 报「无法解析可用版本」        | 发布源缺 `latest.txt` 或包列表；检查源目录结构                   |
| `upgrade` 后自动回滚                    | 查看 `toolboxctl logs -n 100` 定位健康检查失败原因               |
| `rollback` 报「找不到可回滚的历史版本」 | `ls /opt/toolbox/releases/` 确认历史版本存在；用 `--to` 指定     |
| 回滚后版本仍不一致                      | `toolboxctl reload` 强制重载；若仍不一致，手动切软链并重渲染配置 |

### 8.4 容器部署

| 症状                                                   | 排查步骤                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `docker build` 报 `base name should not be blank`      | `ARG` 声明在 stage 内部，需移到第一个 `FROM` 之前                             |
| `pnpm install` 报 `Could not reach registry.npmjs.org` | 设置 `COREPACK_NPM_REGISTRY` 与代理 build-arg（大小写各传一份）               |
| 首页返回 `application/octet-stream`                    | server 级 `types { }` 覆盖了 http 级 MIME 表；删掉 server 级 `types`          |
| `/tools` 返回 301 重定向                               | `try_files $uri $uri/` 触发目录补斜杠；改用 `$uri/index.html`                 |
| 拼错 URL 返回 200 + 首页                               | 兜底写成 `/index.html` 导致软 404；改用 `try_files $uri $uri/index.html =404` |

---

## 9. 安全基线

### 9.1 部署层

- **整包 sha256 校验**：安装/升级前必校验 `.sha256`，缺失即拒绝（`--no-verify` 除外）
- **文件级校验**：bundle 内 `checksums.txt` 逐文件 sha256，安装/升级时再校验一次
- **独立 nginx 实例**：不读 `/etc/nginx`，不影响其它站点
- **worker 降权**：专用低权限用户（默认 `toolbox`），master 仍为 root 绑定端口
- **安全响应头**：`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`
- **CSP 观察版**：`Content-Security-Policy-Report-Only`，生产观察后再强制
- **真正的 404**：避免软 404 污染搜索索引
- **无交互安装**：`curl | bash` 场景下 stdin 被占用，脚本零 `read`

### 9.2 应用层

- **纯前端本地计算**：绝大多数工具在浏览器本地运行，数据不上传
- **外部 API 仅浏览器直连**：DNS/Whois/HTTP 请求/Webhook 等由浏览器直接发往公共接口，不经过服务器
- **密钥不出浏览器**：BYOK（Bring Your Own Key）模式下，Key 仅存 `localStorage`/组件 state，不写文件、不进日志
- **依赖许可校验**：`pnpm check:licenses` 拦截 GPL/AGPL/SSPL/BUSL 等强传染许可
- **无遥测/无追踪**：不收集用户行为数据

---

## 10. 版本号落点（五处必须一致）

| 落点                      | 示例                               | 由谁写入             | 用途                             |
| ------------------------- | ---------------------------------- | -------------------- | -------------------------------- |
| `deploy/binary/VERSION`   | `0.0.6`                            | 手工（真源）         | 打包与 CLI 版本号的唯一来源      |
| bundle 文件名             | `toolbox-0.0.6-linux-amd64.tar.gz` | `build-bundle.sh`    | 用户可见、升级源按名解析版本     |
| bundle 内 `VERSION`       | `0.0.6`                            | `build-bundle.sh`    | 安装时校验「包内版本」           |
| bundle 内 `manifest.json` | `"version": "0.0.6"`               | `build-bundle.sh`    | 追溯「这个包出自哪个提交」       |
| git tag / Release         | `v0.0.6`                           | `gh release create`  | 与源码历史绑定                   |
| `/healthz` 响应           | `ok v0.0.6`                        | nginx 配置渲染期写死 | 证明「当前真正在跑的是哪个版本」 |

---

## 11. 相关文档

| 需求                       | 文档                               |
| -------------------------- | ---------------------------------- |
| CLI 完整参考、healthz 端点 | [`API.md`](API.md)                 |
| 发布流程、版本管理         | [`RELEASE.md`](RELEASE.md)         |
| 变更历史                   | [`CHANGELOG.md`](../CHANGELOG.md)  |
| 开发指南、新增工具流程     | [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| 环境变量完整列表           | [`.env.example`](../.env.example)  |

---

_本文档随代码同步更新，版本：v2.0 · 2026-10-24_

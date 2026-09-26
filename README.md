# Toolbox · 在线工具库

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/zhang123999-qq/toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/zhang123999-qq/toolbox/actions/workflows/ci.yml)

> **870 个纯前端在线工具**：本地优先（数据不上传）、纯静态部署、建目录即自动注册。
> 中英双语 · 明暗主题 · 免登录 · 可离线（规划中）

**中文** | [English](README.en.md)

---

## 状态

| 项       | 值                                                                                     |
| -------- | -------------------------------------------------------------------------------------- |
| 工具总量 | **870 个 / 20 域 / 4 大组**（规划，脚本校验闭合）                                      |
| 已实现   | **190 个**（文本与内容域 70 + 编码加密安全域 60 + 数据格式域 60）——前 190 个已全量交付 |
| 当前版本 | [`v0.0.2`](https://github.com/zhang123999-qq/toolbox/releases/tag/v0.0.2)              |

---

## 在线体验

站点**已上线**，下面两个地址均可正常访问，内容完全一致：

| 地址                      | 状态                      |
| ------------------------- | ------------------------- |
| <https://006336.xyz/>     | ✅ 可访问（主入口）       |
| <https://www.006336.xyz/> | ✅ 可访问（主域名的别名） |

`www` 只是主域名的别名：构建期的 `SITE_ORIGIN` 与每页 canonical 统一指向主域名，
两个地址访问到的是同一份内容。`www` 首次冷连接偶尔较慢，超时重试即可。

也可以按下方「快速开始」把站点部署到自己机器上离线使用——工具全部在浏览器本地运行，
不依赖线上服务。

---

## 快速开始

三条部署链路，按目标机环境任选一条。逐步说明与验证方式见
[`docs/guide/getting-started.md`](docs/guide/getting-started.md)。

### ① 二进制部署（Linux 服务器，推荐）

目标机只需 `sh` + `tar` + `systemd` + `nginx`，**不需要** Node、pnpm、Docker、Go。

一键部署（发布源默认为本仓库，脚本直链：
[`install.sh`](https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh)）：

```bash
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash
```

> 🔒 **先看过再执行**：`curl … | bash` 等于把远程脚本直接交给 shell。
> 建议先 `curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | less`
> 审阅内容（或 `curl -fsSLO` 下载后再看），确认无误再跑上面那条命令。

> 🌐 **装完访问** `http://<目标机IP>:8081/`。默认端口 **8081**（与 Docker 形态一致，
> 也避开了常被占用的特权端口 80）；换端口用 `--port 9090`，或设 `TOOLBOX_PORT=9090`。

自建 / 内网发布源（生产推荐，不依赖 GitHub 可达性；目录内需有 `install.sh`、
`latest.txt`、`toolbox-*.tar.gz` 及其 `.sha256`）：

```bash
# A. 在已有构建产物的机器上起一个发布源（也可改用 nginx / S3 / OSS 托管同一目录）
cd dist-release && python3 -m http.server 8899

# B. 在目标机上一行装完
curl -fsSL http://<发布源IP>:8899/install.sh | sudo bash -s -- --source http://<发布源IP>:8899
```

常用变体：

| 需求           | 追加参数               |
| -------------- | ---------------------- |
| 换端口         | `--port 9090`          |
| 自动安装 nginx | `--install-deps`       |
| 指定版本       | `--version 0.0.1-beta` |
| 先预览要做的事 | `--dry-run`            |

> ✅ **仓库已公开**：`releases/latest/download/install.sh` 匿名可直接下载（已实测 200）。
> 需要离线分发时改用上面的自建发布源。

不走一键脚本的手动安装：

```bash
tar -xzf toolbox-0.0.1-beta-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.1-beta-linux-amd64.tar.gz --install-deps
```

### ② 容器部署

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .
docker run -d --name toolbox-web -p 8081:8081 toolbox-web:dev   # 容器内外都是 8081
```

### ③ 本地开发

```bash
pnpm install --ignore-scripts   # esbuild 的 postinstall 在部分 Windows 环境会 EBUSY
pnpm dev                        # 开发服务器；Windows 沙箱下若报 os error 231，加 --concurrency=1
pnpm check:tools                # 元数据校验（20 域合计 870）
pnpm build:ssg                  # 构建 + SSR 构建 + 预渲染 101 个静态页
```

---

## 命令行速查（`toolboxctl`）

安装后全局可用（`/usr/local/bin/toolboxctl`）。

| 场景         | 命令                                            |
| ------------ | ----------------------------------------------- |
| 状态一览     | `toolboxctl status`                             |
| 健康检查     | `toolboxctl health`                             |
| 起停重载     | `toolboxctl start \| stop \| restart \| reload` |
| 日志         | `toolboxctl logs -f`                            |
| 已装版本     | `toolboxctl list`                               |
| 环境自检     | `toolboxctl doctor`                             |
| 备份配置     | `toolboxctl backup`                             |
| 查可升级版本 | `toolboxctl check-update`                       |
| **在线升级** | `toolboxctl upgrade`                            |
| **回滚**     | `toolboxctl rollback`                           |
| 卸载         | `toolboxctl uninstall [--purge]`                |

> 升级命令的发布源默认值统一指向本仓库：
> `https://github.com/zhang123999-qq/toolbox/releases/latest/download`。
> 优先级为 `--source <基址>` > 配置文件 `UPDATE_SOURCE` > 该默认值；
> 用自建源时把 `UPDATE_SOURCE='<基址>'` 写进 `/etc/toolbox/toolbox.conf` 即可免传参数。

完整说明（四类场景 + 目录布局 + 排障）：[`deploy/binary/README.md`](deploy/binary/README.md)。

---

## 目标机要求（二进制部署）

| 项         | 要求                                                           |
| ---------- | -------------------------------------------------------------- |
| 操作系统   | Linux x86_64 / aarch64                                         |
| init       | systemd                                                        |
| Web 服务器 | nginx ≥ 1.21（`--install-deps` 可自动安装）                    |
| 基线命令   | `sh` `tar` `gzip` `sha256sum` `awk` `sed`，`curl`（或 `wget`） |
| 权限       | root                                                           |
| 磁盘       | ≈ 50 MB（`/opt/toolbox`，含新旧两个版本的冗余）                |

站点运行的是**独立 nginx 实例**（自带 `pid` / 日志 / 临时目录 / MIME 表），
只借用系统 nginx 的**二进制**、完全不读 `/etc/nginx` ——
因此 `toolboxctl stop` 只停本站点，卸载也不会影响同机其它 nginx 站点。

---

## 项目结构

```text
packages/catalog/    20 域 ↔ 4 大组唯一真源表 + Zod 元数据契约 + 路由派生
packages/search/     检索门面（Orama 适配位）
apps/web/            Vite 6 + React 19 + TS + Tailwind v4（含 i18n / theme / 工具目录）
scripts/             目录生成 / 元数据校验 / sitemap / SSG 预渲染 / 文档一致性校验
deploy/docker/       容器部署（多阶段构建 + nginx）
deploy/binary/       二进制部署（bundle 打包 + toolboxctl + 一键安装脚本）
docs/                使用指南、开发手册、规范、发布流程
```

## 文档

| 我想…                      | 看                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| 浏览全部文档               | [`docs/README.md`](docs/README.md)                                                            |
| 安装 / 使用 / 配置 / 排障  | [`docs/guide/`](docs/guide/README.md)                                                         |
| 参与开发 / 新增工具        | [`CONTRIBUTING.md`](CONTRIBUTING.md) + [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)           |
| 看源码组织规范（强制约束） | [`docs/source-organization.md`](docs/source-organization.md) — 一工具一文件夹、命名、依赖范围 |
| 部署到服务器               | [`deploy/binary/README.md`](deploy/binary/README.md)                                          |
| 发包、打 tag、写 changelog | [`docs/RELEASE.md`](docs/RELEASE.md)                                                          |
| 查术语的中英对照           | [`docs/glossary.md`](docs/glossary.md)                                                        |
| 看版本变更                 | [`CHANGELOG.md`](CHANGELOG.md)                                                                |

---

## 许可证

本项目采用 [MIT](LICENSE) 许可，© 2026 zhang123999-qq。

第三方依赖同样只使用宽松许可（MIT / ISC / Apache-2.0 / BSD / CC0 等），
`pnpm check:licenses` 会拦截 GPL / AGPL / SSPL / BUSL 这类强传染或商业限制的许可，
不合规的依赖进不了 CI。新增依赖的要求见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

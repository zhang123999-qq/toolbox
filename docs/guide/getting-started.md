# 安装与快速上手

> **中文** | [English](getting-started.en.md)
> 本文只做一件事：让你在最短时间内把 Toolbox 跑起来。概念与架构见
> [`../spec/README.md`](../spec/README.md)，开发环境与建工具流程见
> [`../DEVELOPMENT.md`](../DEVELOPMENT.md)。

---

## 一、先选一种方式

三条链路交付的是**同一份静态产物**（`apps/web/dist`），差别只在「目标机需要什么」。

| 方式       | 目标机需要                         | 适合                                 | 到本文                               |
| ---------- | ---------------------------------- | ------------------------------------ | ------------------------------------ |
| 二进制部署 | `sh` + `tar` + `systemd` + `nginx` | 单机上线、内网服务器、无 Docker 环境 | [§二](#二二进制部署linux-服务器推荐) |
| 容器部署   | Docker                             | 自托管、横向扩展                     | [§三](#三容器部署)                   |
| 本地开发   | Node 20+ / pnpm                    | 改代码、加工具                       | [§四](#四本地开发)                   |

---

## 二、二进制部署（Linux 服务器，推荐）

### 2.1 前置条件

| 项         | 要求                   | 检查命令                 |
| ---------- | ---------------------- | ------------------------ |
| 操作系统   | Linux x86_64 / aarch64 | `uname -m`               |
| init       | systemd                | `ls /run/systemd/system` |
| Web 服务器 | nginx ≥ 1.21（可代装） | `nginx -v`               |
| 权限       | root                   | `id -u`                  |
| 磁盘       | ≈ 50MB                 | `df -h /opt`             |

装之前可以先自检，缺什么它会直接说：

```bash
curl -fsSL <发布源>/install.sh | sudo sh -s -- --source <发布源> --dry-run
```

### 2.2 一条命令安装

```bash
curl -fsSL <发布源>/install.sh | sudo sh -s -- --source <发布源>
```

`<发布源>` 是一个目录或 HTTP 基址，里面需要有 `install.sh`、`latest.txt`、
`toolbox-<版本>-linux-<架构>.tar.gz` 及其 `.sha256`。没有现成发布源时，
在已有 `dist-release/` 的机器上起一个即可：

```bash
cd dist-release && python3 -m http.server 8899
# 于是发布源 = http://<该机IP>:8899
```

常用参数：

| 需求              | 追加参数          |
| ----------------- | ----------------- |
| 换端口（默认 80） | `--port 8080`     |
| 自动安装 nginx    | `--install-deps`  |
| 指定版本          | `--version 0.0.1` |
| 只落地不启动      | `--no-start`      |
| 先预览动作        | `--dry-run`       |

### 2.3 手动安装

不走一键脚本，或想先审阅包内容时：

```bash
tar -xzf toolbox-0.0.1-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.1-linux-amd64.tar.gz --install-deps
```

一键脚本与手动安装**走的是同一段落地逻辑**（脚本最终就是调 `toolboxctl install`），
所以两者行为不会有分叉。

### 2.4 装完先做三件事

```bash
toolboxctl status     # 服务 / 版本 / 端口 / 健康一览
toolboxctl health     # 探测 /healthz，返回 ok v<版本>
toolboxctl logs -n 50 # 出问题时先看这里
```

---

## 三、容器部署

### 3.1 构建并启动

```bash
docker build -f deploy/docker/Dockerfile -t toolbox-web:dev .
docker run -d --name toolbox-web -p 8081:80 toolbox-web:dev
```

镜像内部已完成 SSG 预渲染，nginx 提供 gzip、静态资源长缓存、WASM MIME 与真正的 404。

### 3.2 端口冲突

宿主 8080 常被别的服务占用，换个映射即可（`-p 8081:80` 表示宿主 8081 → 容器 80）。
容器内始终监听 80，不需要改镜像。

---

## 四、本地开发

### 4.1 环境要求

Node ≥ 20、pnpm ≥ 9。`pnpm install` 用 `--ignore-scripts`：esbuild 的 postinstall
在部分 Windows 环境下会因文件占用失败，而它的二进制来自平台包，不需要该脚本。

### 4.2 常用命令

```bash
pnpm install --ignore-scripts
pnpm dev          # 开发服务器
pnpm verify       # 全量门禁：元数据 + 文档 + lint + 格式 + 类型 + 测试
pnpm build:ssg    # 构建 + SSR 构建 + 预渲染 27 个静态页
```

---

## 五、验证安装

```bash
curl -s http://127.0.0.1/healthz          # 期望：ok v<版本>
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/tools/json-formatter   # 期望：200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/nonexistent-page       # 期望：404
```

第 3 条容易忽略但很重要：未知路径必须返回 **404**，而不是 200 + 首页。
后者叫「软 404」，会把大量无意义页面喂给搜索引擎。

---

## 六、在线体验（尚未上线）

站点尚未上线，以下域名当前**不可访问**，仅作为未来的在线体验入口登记：

| 地址                      | 状态                     |
| ------------------------- | ------------------------ |
| <https://006336.xyz/>     | 尚未上线                 |
| <https://www.006336.xyz/> | 尚未上线（主域名的别名） |

在上线之前，请用本文的三种方式之一在本地或内网访问。
构建期请把 `SITE_ORIGIN` 设为正式域名，否则 sitemap 与页面 canonical 会指向占位地址
（见 [`configuration.md`](configuration.md) §二）。

---

## 七、下一步

| 我想…                    | 看                                               |
| ------------------------ | ------------------------------------------------ |
| 学会用站点与命令行       | [`usage.md`](usage.md)                           |
| 改端口、升级源、站点地址 | [`configuration.md`](configuration.md)           |
| 装不上、起不来           | [`troubleshooting.md`](troubleshooting.md)       |
| 参与开发                 | [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) |

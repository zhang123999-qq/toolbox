# 一键安装（One-line Install）

> **中文** | [English](one-line-install.en.md)
> 本文面向**运维与部署**：一条命令把 Toolbox 静态站装到 Linux 服务器上。
> 开发期构建、Docker 链路见 [`../DEVELOPMENT.md`](../DEVELOPMENT.md) §20；命令行用法见 [`../../deploy/binary/README.md`](../../deploy/binary/README.md)。

---

## 一、它能做什么

[`deploy/binary/install.sh`](../../deploy/binary/install.sh) 是一个可通过管道执行的安装脚本：

```text
curl -fsSL <脚本地址> | sudo bash -s -- [选项]
```

它只做四件事，**真正的落地逻辑全部交给部署包内的 `toolboxctl`** —— 因此「curl 一条命令装」与「手动解包后装」走的是同一条代码路径，不存在两套实现：

| 阶段 | 动作                                                              |
| ---- | ----------------------------------------------------------------- |
| 解析 | 确定版本号与部署包地址（GitHub Releases / 自建发布源 / 本地包）   |
| 校验 | 下载后先比对 sha256，校验不过**绝不安装**                         |
| 落地 | 解包 → 调用 `toolboxctl install` → 渲染配置 → 启动独立 nginx 实例 |
| 收尾 | 在 `--bin-dir` 下放好 `toolbox` / `toolboxctl` 命令入口并确认自启 |

安装完成后的目录布局：站点在 `/opt/toolbox`（`current` 软链指向 `releases/<版本>`），命令在 `/usr/local/bin`。

---

## 二、环境前提与依赖

### 2.1 系统与权限

| 项    | 要求                                                           |
| ----- | -------------------------------------------------------------- |
| 系统  | Linux（脚本首步即校验，非 Linux 直接退出）                     |
| 架构  | `x86_64/amd64` 或 `aarch64/arm64`                              |
| 权限  | **root**（写 `/opt`、`/usr/local/bin`、装 systemd 单元都需要） |
| Shell | `bash`（脚本自带检测；`curl … \| sh` 会提示改用 bash）         |

> 没有 systemd 的机器不会失败：脚本会自动降级为「只落地不启动」（等同 `--no-start`），装完后按提示手动起服务即可。

### 2.2 依赖命令

| 命令             | 是否必需 | 说明                                                            |
| ---------------- | -------- | --------------------------------------------------------------- |
| `curl` 或 `wget` | 必需     | 下载脚本与部署包，二选一                                        |
| `tar`            | 必需     | 解包部署包                                                      |
| `sha256sum`      | 必需     | 完整性校验（`--no-verify` 可跳过）                              |
| `nginx`          | 运行期   | 站点跑在**独立 nginx 实例**上；缺失时加 `--install-deps` 自动装 |
| `systemctl`      | 推荐     | 用于开机自启与日常运维                                          |

一键自检（装完后执行）：

```sh
toolboxctl doctor
```

### 2.3 安装源可达性

脚本按以下优先级确定安装源，**前一条命中就不再往下走**：

1. `--from <URL|文件>` —— 直接用指定的部署包
2. `--source <基址>` —— 自建发布源（目录内需有 `latest.txt`、包、`.sha256`）
3. 默认 —— GitHub Releases

> 本仓库**已公开**：默认方式（GitHub Releases）对匿名请求可直接下载（已实测 200）。
> 离线 / 内网分发改用 `--source` 或 `--from`。详见 [`../RELEASE.md`](../RELEASE.md) §四。

---

## 三、参数速查

| 参数              | 作用                                                  | 取值 / 默认                                                |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `-v`, `--version` | 安装指定版本；`v` 前缀可省略，与参数间空格或 `=` 均可 | 例 `-v 0.0.1`、`--version=0.0.1`；默认最新 Release         |
| `--from`          | 直接用指定的部署包，**跳过版本解析**                  | URL 或本地文件路径                                         |
| `--source`        | 发布源基址（内网分发用）                              | 例 `http://192.168.1.10:8099`；省略时用本仓库 Release 基址 |
| `--proxy`         | 下载走代理，适配国内网络                              | 例 `http://127.0.0.1:10808`                                |
| `--mirror`        | GitHub 下载加速前缀，只改写 `github.com` 的下载链接   | 例 `https://ghfast.top`                                    |
| `--service`       | 装完启用开机自启并立即启动（额外做 systemd 前置检查） | 开关；与 `--no-start` 互斥                                 |
| `--no-start`      | 只落地文件，不启动、不设自启                          | 开关                                                       |
| `--port`          | 站点监听端口                                          | 默认 `80`                                                  |
| `--prefix`        | 站点安装根目录（不影响命令位置）                      | 默认 `/opt/toolbox`                                        |
| `--bin-dir`       | 命令行入口目录                                        | 默认 `/usr/local/bin`                                      |
| `--install-deps`  | 自动安装系统依赖（`apt-get install nginx`）           | 开关                                                       |
| `--no-verify`     | 跳过 sha256 校验（不推荐）                            | 开关                                                       |
| `--dry-run`       | 只打印将要执行的动作，不落地任何文件                  | 开关                                                       |
| `-h`, `--help`    | 显示帮助                                              | ——                                                         |

---

## 四、安装场景示例

以下 `<脚本地址>` 统一指代：

```text
https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh
```

### 4.1 默认安装

装到 `/usr/local/bin` 与 `/opt/toolbox`，服务开机自启并立即启动：

```sh
curl -fsSL <脚本地址> | sudo bash
```

### 4.2 指定版本

版本号带不带 `v` 都可以；指定版本后会跳过「查询最新 Release」，适合内网或私有仓库：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- -v 0.0.1
curl -fsSL <脚本地址> | sudo bash -s -- --version=v0.0.1
```

### 4.3 配置代理（国内网络）

代理会同时传给 `curl` 与子进程 —— 即 `--install-deps` 装 nginx 时也走同一个代理：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- --proxy http://127.0.0.1:10808
```

也可以不传参数，直接沿用环境里已有的代理变量：

```sh
export https_proxy=http://127.0.0.1:10808 http_proxy=http://127.0.0.1:10808
curl -fsSL <脚本地址> | sudo bash
```

若只是 GitHub 下载慢（代理不便），用加速镜像前缀，只改写 `github.com` 的下载链接：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- --mirror https://ghfast.top
```

### 4.4 开机自启

默认就会启用开机自启；`--service` 是**显式声明**，额外做 systemd 前置检查并在装完后确认 `is-enabled` 结果：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- --service
```

反过来，只落地、先不启动（例如要改端口或配置后再起）：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- --no-start
# 之后手动：systemctl enable --now toolbox.service
```

### 4.5 组合使用

指定版本 + 代理 + 自启 + 换端口 + 自动装依赖：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- \
  -v 0.0.1 \
  --proxy http://127.0.0.1:10808 \
  --service \
  --port 8080 \
  --install-deps
```

### 4.6 自建发布源与本地包

内网分发时，把发布产物目录用静态服务器托管（目录内有 `latest.txt`、包、`.sha256`），再指过去：

```sh
curl -fsSL http://192.168.1.10:8099/install.sh | sudo bash -s -- --source http://192.168.1.10:8099
```

已经把包拷到目标机时，连下载都省掉（本地包无 `.sha256` 时会跳过整包校验，但包内仍会做逐文件校验）：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- --from /root/toolbox-0.0.1-linux-amd64.tar.gz
```

### 4.7 先预演再执行

任何组合都可以先加 `--dry-run` 看会发生什么，不落地任何文件：

```sh
curl -fsSL <脚本地址> | sudo bash -s -- -v 0.0.1 --proxy http://127.0.0.1:10808 --dry-run
```

---

## 五、环境变量

同名参数优先于环境变量。

| 变量                                                        | 等价于     | 说明                                    |
| ----------------------------------------------------------- | ---------- | --------------------------------------- |
| `GITHUB_TOKEN`                                              | ——         | 私有仓库取 Release 时需要               |
| `TOOLBOX_REPO`                                              | ——         | 覆盖仓库，默认 `zhang123999-qq/toolbox` |
| `TOOLBOX_PROXY`                                             | `--proxy`  | 下载代理                                |
| `TOOLBOX_MIRROR`                                            | `--mirror` | 下载加速前缀                            |
| `http_proxy` / `https_proxy` / `HTTP_PROXY` / `HTTPS_PROXY` | `--proxy`  | 未显式指定时自动沿用                    |

```sh
GITHUB_TOKEN=ghp_xxx curl -fsSL <脚本地址> | sudo bash -s -- -v 0.0.1
```

---

## 六、安装后验证

```sh
toolboxctl status          # 版本 / 服务状态 / 端口 / 健康检查结果
toolbox version            # 命令入口是否可用（toolbox 是 toolboxctl 的别名）
systemctl is-enabled toolbox.service
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1/    # 期望 200
```

---

## 七、卸载与回滚

```sh
toolboxctl rollback              # 回到上一个版本（失败会自动回滚，也可手动执行）
toolboxctl list                  # 查看已装版本
toolboxctl uninstall --purge     # 完全卸载（--purge-deps 连 nginx 一起卸）
```

---

## 八、故障排查

| 症状                     | 原因与处理                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `需要 root 权限`         | 加 `sudo`，或切到 root 后重跑                                                              |
| `无法确定最新版本`       | 网络不通（或自建源缺 `latest.txt`）。用 `--version` 指定版本，或改用 `--source` / `--from` |
| `下载失败`               | 加 `--proxy` 或 `--mirror`；先 `--dry-run` 确认脚本本身能取到                              |
| `缺少校验文件 … .sha256` | 发布源不完整；确信任性后可加 `--no-verify`（不推荐）                                       |
| `sha256 校验失败`        | 包损坏或被篡改，已中止；重新下载或换源                                                     |
| `端口已被占用`           | 换 `--port`，或先释放该端口                                                                |
| 命令 `toolbox` 找不到    | 检查 `--bin-dir` 是否在 `PATH` 中                                                          |
| 服务没起来               | `toolboxctl doctor` 与 `toolboxctl logs -f`；无 systemd 的机器需手动起服务                 |

更多症状见 [`../guide/troubleshooting.md`](../guide/troubleshooting.md)。

---

## 九、与 htop-s 安装方式的差异

本脚本沿用 htop-s 那条链路的形态（`curl … | sudo bash`、分步彩色输出、`--version` / `--service` / `--proxy` / `--prefix` 参数命名），并做了这些改进：

| 维度         | htop-s                               | 本文脚本                                                         |
| ------------ | ------------------------------------ | ---------------------------------------------------------------- |
| 完整性校验   | 找不到 `.sha256` 就跳过              | **缺失即中止**（`--no-verify` 才跳过）                           |
| 下载健壮性   | 单次尝试                             | 失败自动重试 2 次，并对下载体积设下限（防止错误页被当成包）      |
| 代理覆盖范围 | 只作用于 `curl`                      | 同时导出给子进程，`--install-deps` 装依赖也走代理                |
| 国内网络     | 只有代理                             | 额外支持 `--mirror` 加速前缀                                     |
| 无 systemd   | 跳过服务安装（提示手动）             | 自动降级为只落地不启动，不会装到一半失败                         |
| 目录参数     | `--prefix` 与 `--service` 冲突需拒绝 | `--prefix`（站点根目录）与 `--bin-dir`（命令目录）解耦，互不冲突 |
| 命令入口     | 单个程序名                           | 同时提供 `toolbox` 与 `toolboxctl`，入口目录可配                 |
| 预演         | 无                                   | 支持 `--dry-run`                                                 |

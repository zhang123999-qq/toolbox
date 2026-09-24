# 二进制部署（toolboxctl）

把一个**预构建好的自包含 bundle** 部署到 Linux 服务器，并管理它的安装、卸载、
日常运维与在线升级。目标机**不需要源码、不需要 Node/pnpm 工具链、不需要 Docker**。

---

## 最短路径（只想尽快装起来）

```bash
# 装（一行；发布源默认为本仓库，脚本直链见下）
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash

# 看
toolboxctl status && toolboxctl health

# 升级 / 回滚 / 卸载（升级源默认同样是本仓库 Release，可省略 --source）
toolboxctl upgrade
toolboxctl rollback
toolboxctl uninstall --purge
```

> 🔒 **先看过再执行**：`curl … | bash` 会把远程脚本直接交给 shell。
> 建议先 `curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | less`
> 审阅，确认无误再执行。

没有现成发布源？在已有 `dist-release/` 的机器上 `cd dist-release && python3 -m http.server 8899`，
发布源就是 `http://<该机IP>:8899`，装的时候加 `--source http://<该机IP>:8899`。

> ✅ 仓库已公开：升级源默认值
> `https://github.com/zhang123999-qq/toolbox/releases/latest/download`
> 匿名可访问（已实测 200）。离线环境用自建 / 内网源覆盖它 —— 详见
> [`docs/RELEASE.md` §四](../../docs/RELEASE.md)。

其余章节是四类场景的完整说明、目录布局与排障，按需查阅。

---

## 和其他两种部署方式的分工

| 方式           | 目录                  | 目标机需要                         | 适用                                 |
| -------------- | --------------------- | ---------------------------------- | ------------------------------------ |
| 源码部署       | 仓库根 `package.json` | Node ≥ 22.22 / pnpm / 源码         | 开发、CI                             |
| 容器部署       | `deploy/docker/`      | Docker                             | 自托管、横向扩展                     |
| **二进制部署** | `deploy/binary/`      | `sh` + `tar` + `systemd` + `nginx` | 单机上线、内网服务器、无 Docker 环境 |

## 一、产出物

`deploy/binary/build-bundle.sh` 生成：

```
dist-release/
├── toolbox-0.0.1-linux-amd64.tar.gz         自包含部署包（~700KB）
├── toolbox-0.0.1-linux-amd64.tar.gz.sha256  整包校验值（升级前校验）
├── latest.txt                                最新版本号（升级源用）
└── index.json                                已发布版本索引
```

bundle 内部：

```
VERSION                 版本号
manifest.json           元信息（版本/架构/构建时间/git commit/健康检查路径）
checksums.txt           逐文件 sha256（安装与升级时都会校验）
README.md               本文件
app/                    预构建静态产物（= apps/web/dist）
bin/toolboxctl          管理 CLI（POSIX sh 单文件）
conf/nginx.conf.tpl     独立 nginx 实例的主配置模板
conf/toolbox.service.tpl  systemd unit 模板
conf/mime.types         自带 MIME 表（不依赖目标机的 /etc/nginx/mime.types）
```

```bash
# 打包（版本取 deploy/binary/VERSION，架构取本机）
deploy/binary/build-bundle.sh
deploy/binary/build-bundle.sh --version 0.0.2 --arch amd64 --out dist-release
deploy/binary/build-bundle.sh --skip-build          # 复用已有 apps/web/dist
```

## 二、目标机目录布局

```
/opt/toolbox/
├── releases/
│   ├── 0.0.1/            ← 不可变：解包即用，升级只新增目录，不原地改
│   └── 0.0.2/
├── current -> releases/0.0.2     ← 唯一的切换点（软链，原子替换）
├── shared/
│   ├── nginx.conf        由模板渲染，指向 current/app
│   ├── toolbox.service   渲染结果（同时安装到 /etc/systemd/system/）
│   └── state/            installed / previous（升级与回滚依据）
├── logs/                 access.log / error.log
└── run/                  nginx.pid 与各类临时目录
/etc/toolbox/toolbox.conf          运行配置（PREFIX/PORT/升级源等）
/usr/local/bin/toolboxctl -> /opt/toolbox/current/bin/toolboxctl
```

**为什么把不可变版本与共享状态分开**：升级 = 解包到新目录 + 原子切软链，
任何一步失败都能把软链指回旧目录，不会出现「文件被改到一半」的中间态。

**为什么用独立 nginx 实例**：配置里自带 `pid` / `error_log` / `access_log` /
`*_temp_path` / MIME 表，只借用系统的 nginx **二进制**，完全不读 `/etc/nginx`。
因此 `toolboxctl stop` 只停本站点，卸载也不会碰机器上其它 nginx 站点。

## 三、四类场景

### 1. 安装

**方式 A：一键安装（推荐，单条命令）**

```bash
# 从 GitHub Release 取最新版（入口与 tag 绑定，推荐；仓库已公开，匿名可下载）
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash

# 指定版本 / 端口 / 自动装依赖
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/download/v0.0.1/install.sh \
  | sudo bash -s -- --version 0.0.1 --port 8080 --install-deps

# 内网发布源（生产推荐：不依赖 GitHub 可达性）
curl -fsSL http://<发布源>/install.sh | sudo bash -s -- --source http://<发布源>
```

脚本会：判定架构 → 解析版本 → 下载 bundle 与 `.sha256` → **校验通过才解包** →
把落地动作交给 bundle 内的 `toolboxctl`（与手动安装同一条代码路径）。
`--dry-run` 可先预览动作。

安装脚本还支持 `--proxy <代理>`（下载走代理，装依赖时也生效）、`--mirror <前缀>`（GitHub
下载加速）、`--service`（显式开启开机自启）、`--bin-dir`（命令入口目录，默认 `/usr/local/bin`，
装完后 `toolbox` 与 `toolboxctl` 两个命令都可直接用）。

> 全部参数、逐场景命令示例与排障见
> [`docs/deploy/one-line-install.md`](../../docs/deploy/one-line-install.md)
> （英文 [`one-line-install.en.md`](../../docs/deploy/one-line-install.en.md)）。

> ⚠️ 仓库当前为 **private**：上面两条 GitHub 直连都会 404（已实测）。
> 三选一——转 public、安装时带 `GITHUB_TOKEN`，或统一走内网发布源。
> 发布与版本号规则见 [`docs/RELEASE.md`](../../docs/RELEASE.md)。

**方式 B：手动安装**

```bash
# 目标机上前置：只需 nginx（没有可用 --install-deps 代装）
scp dist-release/toolbox-0.0.1-linux-amd64.tar.gz* root@<host>:/root/
ssh root@<host>
tar -xzf /root/toolbox-0.0.1-linux-amd64.tar.gz -C /root/pkg
/root/pkg/bin/toolboxctl install --from /root/toolbox-0.0.1-linux-amd64.tar.gz --install-deps
```

`install` 依次做：前置检查（root / systemd / nginx / 端口占用 / 磁盘）→ 校验完整性
→ 落地 `releases/<ver>` → 原子切 `current` → 渲染并校验 nginx 配置 → 创建 `toolbox`
系统用户 → 安装 systemd unit → 启动 + 健康检查。

常用参数：

| 参数                        | 说明                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| `--from <tar.gz\|dir\|url>` | 来源；省略时用脚本所在目录（已在 bundle 内解包的情形）                           |
| `--port N`                  | 监听端口，默认 80                                                                |
| `--prefix DIR`              | 安装根目录，默认 `/opt/toolbox`                                                  |
| `--nginx-user U`            | worker 运行用户，默认 `toolbox`；`nobody` 表示不建用户                           |
| `--install-deps`            | 自动 `apt-get install nginx`，并停用系统自带的 `nginx.service`（本站用独立实例） |
| `--no-start`                | 只落地不启动                                                                     |

### 2. 卸载

```bash
toolboxctl uninstall                 # 停服务、摘 unit 与软链，保留配置/日志/共享状态
toolboxctl uninstall --purge         # 连 /opt/toolbox、/etc/toolbox、专用用户一起删
toolboxctl uninstall --purge-deps    # 若 nginx 是本工具装的，一并卸载
```

默认**不删** `/etc/toolbox/toolbox.conf`、`logs/`、`shared/`，也不动 nginx 包——
重装或排查时还用得上。要彻底干净再加 `--purge`。

### 3. 日常运维

```bash
toolboxctl status                 # 服务/版本/端口/访问地址/健康/备用版本
toolboxctl start|stop|restart|reload
toolboxctl health                 # 探测 /healthz 并回显版本
toolboxctl logs -n 100            # journal + nginx error/access
toolboxctl logs -f                # 持续跟踪
toolboxctl config                 # 打印生效配置与渲染后的 nginx.conf
toolboxctl list                   # 已安装版本（* 标记当前）
toolboxctl backup                 # 备份配置与状态 → /var/backups/toolbox/
toolboxctl doctor                 # 环境自检：依赖/端口/磁盘/权限/健康
toolboxctl version
```

### 4. 在线升级

升级源只需一个能放文件的静态 HTTP 服务（对象存储、nginx、`python3 -m http.server` 都行），
目录里放 `latest.txt` + 各版本 tar.gz 及其 `.sha256`（打包脚本已生成 `latest.txt`/`index.json`）。

```bash
# 查询（--source 省略时用默认源：https://github.com/zhang123999-qq/toolbox/releases/latest/download）
toolboxctl check-update
# 升级（校验失败/健康检查失败都会自动回滚）
toolboxctl upgrade
# 换自建 / 内网发布源
toolboxctl upgrade --source http://releases.internal/toolbox/
toolboxctl upgrade --source /srv/releases --to 0.0.2
# 回滚
toolboxctl rollback                    # 回到 shared/state/previous 记录的版本
toolboxctl rollback --to 0.0.1
```

也可以把源写进配置，之后免传 `--source`：

```bash
echo "UPDATE_SOURCE='http://releases.internal/toolbox/'" >> /etc/toolbox/toolbox.conf
```

**升级流程**：确定目标版本 → 下载 tar.gz + `.sha256` → 整包校验 → 解包到
`releases/<v>.staging` → 文件级校验 → 原子改名 → 切 `current` → 用新模板重渲染配置并
`nginx -t` → `systemctl reload` → 探测 `/healthz`。

**任一步失败**（校验不过、配置语法错、健康检查不通过）都会把 `current` 切回原版本、
重渲染并 reload，然后以非 0 退出——不会留下半死不活的站点。

## 四、目标机前置条件

| 依赖                                 | 必需     | 说明                                                                  |
| ------------------------------------ | -------- | --------------------------------------------------------------------- |
| Linux + x86_64                       | ✅       | 产物是平台无关的静态文件，架构只写在 manifest 里                      |
| systemd                              | ✅       | 以服务方式管理（`/run/systemd/system` 存在）                          |
| nginx                                | ✅       | 可用 `--install-deps` 代装；版本 1.21+ 亦可（本 bundle 自带 MIME 表） |
| `tar` `gzip` `sha256sum` `awk` `sed` | ✅       | 基线工具                                                              |
| `curl` 或 `wget`                     | 升级需要 | 本地目录作为升级源时不需要                                            |
| root                                 | ✅       | 安装/卸载/管理服务                                                    |

Docker、Node、Python **都不需要**。

## 五、验证

```bash
# 1) 开发机：在容器里验证 nginx 配置能真实服务（不需要 systemd）
MSYS_NO_PATHCONV=1 docker run --rm -v "F:/max:/w" -w /w nginx:1.27-alpine \
  sh /w/deploy/binary/tests/verify-nginx-config.sh \
  /w/dist-release/toolbox-0.0.1-linux-amd64.tar.gz

# 2) 目标机：自检 + 端到端
toolboxctl doctor
toolboxctl status
curl -s http://127.0.0.1/healthz
```

`verify-nginx-config.sh` 覆盖：解包、文件级校验、软链布局、模板渲染（含「无残留占位符」）、
`nginx -t`、真实起服务，以及 9 条正常路由 200 / 3 条异常路由 404 / `404.html` 命中 /
工具页预渲染 DOM / JS 的 gzip+immutable+MIME 断言。

## 六、排障

| 现象                  | 原因与处理                                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| `未找到 nginx`        | 加 `--install-deps`，或先手动 `apt-get install -y nginx`                        |
| `端口 80 已被占用：…` | 换端口 `--port 8080`，或先释放占用进程；`doctor` 会先报出来                     |
| 服务起不来            | `toolboxctl logs -n 50`；再 `nginx -t -c /opt/toolbox/shared/nginx.conf` 看语法 |
| 健康检查失败          | `curl -v http://127.0.0.1:<port>/healthz`；多半是端口被占或 app 目录不可读      |
| 升级后仍是旧版本      | 浏览器/CDN 缓存；`/healthz` 的版本号才是服务端真值                              |
| `sha256 校验失败`     | 包传输损坏或源被篡改——升级会中止，属预期保护                                    |
| 想回到上一版          | `toolboxctl rollback`（不需要重新下载）                                         |
| 页面 404 但文件明明在 | 检查 `current` 软链指向，`toolboxctl config` 可见渲染后的 `root`                |

## 七、安全说明

- 每次安装与升级都做**整包 sha256 + 逐文件 sha256** 校验，不通过即中止。
- worker 以专用低权限用户（默认 `toolbox`）运行，master 才需要 root。
- 升级源建议放在内网 HTTPS 上；`latest.txt` 只用于版本比对，**校验值不以它为准**
  （实际以 `.sha256` 伴生文件 + bundle 内 `checksums.txt` 为准）。
- CLI 只操作 `PREFIX` 内的文件、一个 systemd unit 和一个 `/usr/local/bin` 软链；
  卸载默认不删配置与日志，也不动系统 nginx 包。

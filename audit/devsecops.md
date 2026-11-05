# 审计 4: DevSecOps — 部署与运维 (L4)

> 范围: `deploy/binary/install.sh`, `deploy/binary/toolboxctl`, `deploy/binary/build-bundle.sh`, `deploy/binary/packaging/*`, `Dockerfile` (根 + `deploy/docker/Dockerfile` / `Dockerfile.test`), `deploy/nginx/default.conf`, `docker-compose.yml` (根 + `deploy/docker/docker-compose.*.yml`), `.github/workflows/{ci,release}.yml`, `.dockerignore`
> 审计方式: glob/read/grep 取证 (2026-11-04)
> 分级: P0 = 可直接利用的供应链/提权通道; P1 = 明确弱化隔离/可信链; P2 = 加固项

---

## 1. 部署拓扑 (实测)

| 入口          | 文件                                                                                                          | 形态                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 一键安装      | `deploy/binary/install.sh:1-65`                                                                               | `curl -fsSL https://github.com/.../latest/download/install.sh \| sudo bash`                       |
| 运维 CLI      | `deploy/binary/toolboxctl:1-20`                                                                               | POSIX sh, 落地到 `/opt/toolbox/{releases,current,shared,run,logs}` + `/usr/local/bin/toolboxctl`  |
| 打包          | `deploy/binary/build-bundle.sh:1-20`                                                                          | 生成 `toolbox-<ver>-linux-<arch>.tar.gz` + `.sha256` + `latest.txt` + `index.json` + `install.sh` |
| 容器          | `Dockerfile:13-106`, `deploy/docker/Dockerfile:4-71`                                                          | 多阶段 (builder → nginx:alpine), 8081                                                             |
| nginx/systemd | `deploy/binary/packaging/nginx.conf.tpl:13-37`, `toolbox.service.tpl:17-26`, `deploy/nginx/default.conf:5-32` | 独立 nginx 实例 (`-c @PREFIX@/shared/nginx.conf`)                                                 |
| CI/CD         | `.github/workflows/ci.yml:1-99`, `release.yml:1-129`                                                          | tag-push 自动组 bundle → `gh release upload --clobber`                                            |

`.github/workflows/*.yml` 以 `glob` pattern 需以根目录锚定; 实际命中 `toolbox/.github/workflows/ci.yml` / `release.yml` (glob 工具首轮按 `**/.github/**` 漏检已纠正)。

---

## 2. P0 — 供应链与提权 (需立即修复)

### P0-1 curl|bash 与 sha256 同源 TOFU,无 GPG/sigstore 签名 — MITM = root RCE

- 证据:
  - `deploy/binary/install.sh:6` 官方一键命令无任何校验,管道直灌 `sudo bash`。
  - `deploy/binary/install.sh:415-426` 整包校验的 `.sha256` 与包 **同 URL 同源** (`fetch "$PKG_URL.sha256"`),同源被控即自洽绕过。
  - `deploy/binary/install.sh:289-300` `--mirror` 默认建议 `https://ghfast.top`,第三方加速站拿到 Release 路径明文重写,全链无签名可验。
  - `deploy/binary/build-bundle.sh:134` 仅 `sha256sum > .sha256`; `release.yml:121-127` 仅上传 `.sha256`,全仓 grep 无 `gpg|minisign|cosign|sigstore|attestation|provenance`。
  - `toolboxctl` 升级路径 `fetch_release` (`deploy/binary/toolboxctl:1117-1132`) 同理: `.sha256` 伴生无则 **warn 跳过**,有则同源校验。
- 后果: CDN/镜像站/发布源被控或 TLS 中间人 (无 `--proto '=https'` 限制,见 P0-3) 可推送自洽 `(恶意包, 恶意 sha256)`; `install.sh:459` 以 root 执行包内 `toolboxctl`。

### P0-2 自指校验: `checksums.txt` 与 `toolboxctl` 来自同一不可信包

- 证据: `deploy/binary/toolboxctl:381-395` `verify_checksums` 只验包内 `checksums.txt`; `install.sh:434-459` 解包后直接 `sh "$CTL"` (root) 执行该 `toolboxctl`。
- 后果: 攻击者包必然自洽;所谓「文件级校验」对外部篡改者是同义反复。

### P0-3 允许 `http://` 明文源 + Token 明文外泄

- 证据: `deploy/binary/install.sh:311` `--from http://*|https://*`; `install.sh:323-332` `--source` 拼 `http://<内网源>` 可无 TLS; `install.sh:249-274` `fetch/fetch_text` 在 `TOKEN` 非空时对**任意** `$1` 发送 `Authorization: Bearer $TOKEN`,含 http 源。
- `deploy/binary/toolboxctl:489,1085,1117` 下载/升级源同样 `http://*|https://*`。
- 后果: 中间人嗅探 `GITHUB_TOKEN` + 注入明文包 (配合 P0-1 同源 sha256 一并伪造)。

### P0-4 `load_conf` 以 shell `source` 解析 `/etc/toolbox/toolbox.conf`,并以 root 落地任意 `--prefix`

- 证据: `deploy/binary/toolboxctl:151-158`
  ```sh
  if [ -f "$CONF_FILE" ]; then . "$CONF_FILE"; fi   # CONF_FILE=/etc/toolbox/toolbox.conf:70
  ```
  该文件由 `save_conf` (`161-174`) 写出且 `chmod 644`,root 进程 `source` 它; `--prefix` 在 `main` 仅校验绝对路径 (`toolboxctl:1406-1409`),`render_tpl` 以 `sed "s|@PREFIX@|..."` 无转义拼接 (`289-297`), `cmd_uninstall` `rm -rf "$PREFIX"` (`777-782`)。
- 后果: 配置写权限或 `--prefix /` / `/etc` / `/usr` 误操作 = root 代码执行 / 数据毁灭。`--prefix` 未做白名单 (仅限 `/opt/toolbox*` 或拒绝 `/`, `/etc`, `/usr` 等)。

### P0-5 tar 解包无 traversal/symlink 防护,验证在解包之后

- 证据: `deploy/binary/toolboxctl:503,515,528,1143` 均 `tar -xzf ... -C "$WORK/extract"` 无 `--no-same-owner` / `--no-overwrite-dir` / 成员白名单; `install.sh:434` 同。校验在解包后 (`toolboxctl:649-652`) 只能发现不一致,不能阻止 `../`/绝对路/符号链接在 `$WORK` 内先落地,`cp -a . "$DEST/"` (`663`) 原样保留符号链接。
- 后果: 恶意 bundle 可在解包阶段写 `$WORK` 外或在 `DEST` 留符号链接 (后续 nginx `root @PREFIX@/current/app` 跟随)。

### P0-6 GH Actions / 容器基础镜像 tag 浮动,无 SHA 钉选

- 证据: `ci.yml:25,27,32,96` `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`; `release.yml:45,50,52` 同; `Dockerfile:14-15` `node:24-alpine`, `nginx:1.27-alpine` (浮动 tag,构建非确定); `docker-compose.yml:80` 注释反代 `nginx:1.27-alpine`。
- 后果: Action/镜像 tag 被劫持或静默推新 = 供应链投毒; `release.yml` 以此构建产物直接 `gh release upload --clobber` (`121-127`,且 `--clobber` 覆盖既有资产)。
- `Dockerfile` 另有非钉选镜源: `COREPACK_NPM_REGISTRY=https://registry.npmmirror.com` (`deploy/docker/Dockerfile:15-16`),测试镜像 `PLAYWRIGHT_DOWNLOAD_HOST` npmmirror (`Dockerfile.test:24-25`), `APT_MIRROR=https://mirrors.aliyun.com` (`57`),且 CA 包 `fetch("https://curl.se/ca/cacert.pem")` 无校验直写系统信任库 (`Dockerfile.test:67`)。

### P0 修复代码 (最小闭环)

**a) 为 release 加离线签名并钉选信任根 (CI 侧, `release.yml` 追加):**

```yaml
- name: Sign bundle (minisign)
  env:
    MINISIGN_SECRET_KEY: ${{ secrets.MINISIGN_SECRET_KEY }}
  run: |
    set -euo pipefail
    curl -fsSL https://github.com/jedisct1/minisign/releases/download/0.12/minisign-linux.tar.gz -o /tmp/minisign.tgz
    tar -xzf /tmp/minisign.tgz -C /tmp minisign-linux/minisign
    /tmp/minisign-linux/minisign -Sm "$TARBALL" -s "$RUNNER_TEMP/minisign.key" -x "$TARBALL.sig"
  # 上传: *.tar.gz.sig + minisign.pub (pinned), 不要只传 .sha256
```

**b) `install.sh` / `toolboxctl` 强制 HTTPS + 签名校验 + 跟随签名验 `.sha256` (替换同源裸校验):**

```sh
# 顶部常量 (钉死 minisign 公钥, 通过仓库 / 文档分发, 不从同一 Release 下载)
MINISIGN_PUB="RWQZ..."   # 与 release 的 minisign.pub 一致
case $PKG_URL in https://*) ;; *) die "仅接受 https:// 发布源 (拒绝 http:// 明文)";; esac
# 下载后:
minisign -Vm "$WORK/pkg.tar.gz" -p "$MINISIGN_PUB" -x "$WORK/pkg.tar.gz.sig" \
  || die "minisign 签名校验失败,拒绝安装"
# .sha256 只作为二次一致性检查, 不再是信任根; 删除 --no-verify / 无校验 warn 分支
```

**c) 收紧 `load_conf` / `--prefix` / tar:**

```sh
# toolboxctl load_conf: 不再 source 任意 conf; 仅解析 KEY=VALUE 白名单
load_conf() {
  [ -f "$CONF_FILE" ] || return 0
  while IFS='=' read -r k v; do
    case $k in PREFIX|PORT|NGINX_USER|NGINX_BIN|UPDATE_SOURCE|SERVICE_NAME) eval "$k=\$v";; esac
  done < "$CONF_FILE"
}
# --prefix 白名单 (main 入口处):
case $PREFIX in /opt/toolbox|/opt/toolbox/*) ;; *) usage_err "--prefix 仅允许 /opt/toolbox 下";; esac
# tar:
tar --no-same-owner --no-overwrite-dir --delay-directory-restore -xzf "$WORK/pkg.tar.gz" -C "$WORK/x" \
  || die "解包失败"
# 解包后拒绝符号链接逃逸:
[ -L "$WORK/x" ] && die "包根为符号链接,拒绝"
find "$WORK/x" -type l -lname '/*' -o -type l -lname '../*' | grep . && die "包内含逃逸符号链接"
```

**d) Actions 与基础镜像 SHA 钉选 (`ci.yml` / `release.yml` / `Dockerfile`):**

```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
- uses: pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda # v4.x 固定 commit
- uses: actions/setup-node@49933ea5288caeca8642d980e648f74fc8f16 # v4.x 固定 commit
```

```dockerfile
FROM node:24-alpine@sha256:<digest> AS builder
FROM nginx:1.27-alpine@sha256:<digest> AS production
```

---

## 3. P1

### P1-1 sudo 提权边界 — 全程 root,无最小化,token 易泄

- 证据: `install.sh:199` `[ "$(id -u)" = "0" ] || die ... sudo bash`; `toolboxctl:138-139` `need_root`; 特权写 `/etc/systemd/system/toolbox.service` (`toolboxctl:72,358-359`), `/etc/toolbox/toolbox.conf` (`161-174`), `/usr/local/bin/toolboxctl` (`687`), `useradd/userdel` (`371-374,785`), `apt-get update/install nginx` (`469-471`) 并 `systemctl disable --now nginx` (`476`)。
- `install.sh:349` 提示 `GITHUB_TOKEN=<token> $0` 将 token 写入 shell 历史与进程表。

### P1-2 `deploy/docker/Dockerfile` 生产镜像默认 root,不降权

- 证据: `deploy/docker/Dockerfile:46-71` 无 `USER`,无 `chown`,nginx worker 以 root 跑; 与根 `Dockerfile:96` `USER nginx` 不一致。`docker-compose.dev.yml:1-23` / `docker-compose.test.yml` 无 `read_only`/`cap_drop`/`no-new-privileges`/`security_opt`/`deploy.resources`, `test` 挂载 `../../.agent/test-logs:/app/.agent/test-logs` (`65`)。

### P1-3 systemd 单元无沙箱与最小能力集

- 证据: `toolbox.service.tpl:17-26` 仅 `Type, ExecStart, ExecReload, ExecStop, Restart=on-failure, RestartSec, LimitNOFILE`; 无 `User/Group` (master 以 root), `ProtectSystem=strict`, `PrivateTmp`, `ProtectHome`, `ProtectKernelTunables`, `NoNewPrivileges=yes`, `CapabilityBoundingSet=`, `RestrictAddressFamilies`, `MemoryDenyWriteExecute`, `UMask=0027`。
- `ExecReload=/bin/kill -s HUP $MAINPID` (`20`) 无 `ExecReloadPre=nginx -t` 配置预检。

### P1-4 nginx 配置未设公共安全基线

- 证据: `deploy/nginx/default.conf:5,27-32` 监听明文 8081, 仅 `X-Frame-Options/X-Content-Type-Options/Referrer-Policy` + `Content-Security-Policy-Report-Only` (含 `unsafe-inline` `script-src 'self' 'unsafe-inline'`); 无 `server_tokens off` (仅 `nginx.conf.tpl:37` 有), `client_max_body_size`, `limit_req_zone/limit_req`, `listen ... backlog`, HSTS/TLS (无 `ssl_`/`Strict-Transport-Security` — 静态站直连明文时 HSTS 不适用,但反代注释 `docker-compose.yml:77-97` 未给 TLS 模板), `Permissions-Policy`。
- `add_header` 在 `location /` 与 server 级重复时继承语义不一致 (`default.conf:27-32,84-87`),易丢头。

### P1-5 CI 最小权限与不可变性欠缺

- 证据: `ci.yml:11-12` 顶层 `permissions: contents: read` (优),但未做 job 级收窄; `release.yml:30-31` 顶层 `contents: write` 覆盖全工作流,应下沉到 `bundle` job; 无 `id-token: write`, `attestations: write`, SLSA provenance, `environment:` 保护; `concurrency: release-${{...}}` 串行优,但无并发覆盖保护。
- `release.yml:89` `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` 正确,但无 `secrets` 掩码之外的隔离 (step 内 `mktemp` notes 可被第三方 action 读取)。

### P1-6 Dockerfile 构建期供应链未锁

- 证据: `Dockerfile:28,39` `corepack prepare pnpm@12.3.4` 与 `pnpm install --frozen-lockfile --ignore-scripts` (锁文件优),但 `deploy/docker/Dockerfile:20,28` `corepack prepare pnpm@12.3.4` + `pnpm install --frozen-lockfile` (无 `--ignore-scripts`),未经验证的 registry 代理 (`Dockerfile.test:28-31` 把宿主 `HTTP_PROXY` 透传,容器 `127.0.0.1` 劫持面); `apk add python3 make g++` (`Dockerfile:24-28`) 无版本钉选; `COPY . .` (`Dockerfile:42`, `deploy/docker/Dockerfile:30`) 把构建上下文全量拷入层,依赖 `.dockerignore` (`.dockerignore:3-19` 排除 `.git/node_modules/dist/.env`,优但 `!.env.example` 仍需确认示例无真密钥)。

### P1-7 随机/超时与状态不一致

- `toolboxctl:1377-1409` `--prefix` 全命令统一剥离 (优),但 `cmd_render` 允许任意 `--tpl-dir/--out` (`301-352`) 且无 root 校验,结合 `render_tpl` 的 sed 注入面 (见 P0-4),CI 调用即有风险。
- `health_check` 依赖 `/healthz` 响应体 `ok vX` (`430-446`) 做版本确认,无 TLS/签名,本机代理绕行已正确处理 (`406-408 --noproxy '*'`)。

---

## 4. P2

### P2-1 compose 遗留写法

- `docker-compose.yml:14` `version: "3.8"` 已弃用; `23-25` `BUILD_DATE: ${BUILD_DATE:-$(date ...)}` Compose 不展开 `$(...)` 会成字面量; `40-41` `cap_add: NET_BIND_SERVICE` 在 8081 (>1024) 无必要; `34-36` `tmpfs ...:exec` 允许从 cache/log/run 执行文件 (建议 `noexec,nosuid,nodev`); `ports: "8081:8081"` (`56`) 暴露宿主全接口。

### P2-2 体积与缓存

- 生产 `Dockerfile:21-52` 构建期先拷依赖清单 (`33`) 后 `COPY . .` (`42`) — 与 `deploy/docker/Dockerfile:23-30` 一致,缓存优;但 `apk add python3 make g++` (`Dockerfile:24-28`) 留在 builder 层,生产阶段 (`55-106`) 仅 nginx:alpine + 产物,体积克制。根 `Dockerfile:79` `COPY --from=builder --chown=nginx:nginx ...` 正确; `deploy/docker/Dockerfile:49` 无 `--chown` (与 P1-2 联动,worker 读文件靠 root 权限兜底)。
- `build-bundle.sh:127-128` 刻意 0755 修目录以免 403,源于 `mktemp -d` 0700,已在打包期修复 (非运行时补救)。

### P2-3 日志与容量

- `docker-compose.yml:65-69` json-file `max-size:10m max-file:3` (优); `toolboxctl` 独立实例日志在 `PREFIX/logs` 无轮转策略 (`nginx.conf.tpl:15,32`) 靠运维。

### P2-4 其他

- `install.sh:213` 预检仅 `tar/sha256sum/curl|wget`,未预检 `sed/grep/awk/mktemp`,在 busybox 目标机可能后段才失败。
- `toolboxctl:339-352` `cmd_render` 无 nginx 二进制时仅 warn 并仍渲染,留与目标机不匹配的产物给 CI。
- 升级/回滚先写 `previous` 状态再操作 (`toolboxctl:1276,1361`),失败回滚中断会残留半状态; `health_wait` 窗口 60s/40s/20s 不一致 (`702,1323,1041`) 说明在文档对应调整。

---

## 5. 肯定的做法 (避免退化)

- `install.sh:41-44` 设计要点先校验后解包,`toolboxctl` 往返一致; `396-405` 下载体积下限防错误页误装; `459` 显式检查 `toolboxctl` 退出码。
- `toolboxctl:669-672,1277-1279` `current` 软链原子 `ln -sfn + mv -Tf`; `upgrade:1260-1272` staging + `mv`、`health_wait_version` 轮询 `ok v$ver` 失败自动回滚 (`1300-1311`)。
- `ci.yml:11-12` `contents: read`, `15-17` 并发取消; `release.yml:60-75` tag 与 `VERSION` 对齐校验; `33-37` 发布串行不取消。
- 根 `Dockerfile:66-96` `USER nginx`, `docker-compose.yml:32-44` `read_only + cap_drop ALL + no-new-privileges + cpus/memory`。
- `nginx.conf.tpl:37` `server_tokens off`; `default.conf:74-78,84-87` 软404 与长缓存策略。

---

## 6. 资产清单 (必查对照)

| 必查项                          | 命中                                                                      | 状态                                             |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `install.sh`                    | `toolbox/deploy/binary/install.sh`                                        | 见 P0-1~3                                        |
| `toolboxctl*`                   | `toolbox/deploy/binary/toolboxctl`                                        | 见 P0-2,4,5                                      |
| `Dockerfile*`                   | `Dockerfile`, `deploy/docker/Dockerfile`, `deploy/docker/Dockerfile.test` | 根版优, `deploy/docker/Dockerfile` root (P1-2)   |
| `docker-compose*`               | `docker-compose.yml`, `deploy/docker/docker-compose.{dev,test}.yml`       | 见 P1-2/P2-1                                     |
| `nginx*.conf`                   | `deploy/nginx/default.conf`; systemd 另有 `packaging/nginx.conf.tpl`      | 见 P1-4                                          |
| `*.service` / systemd 模板      | `deploy/binary/packaging/toolbox.service.tpl`                             | 见 P1-3 (仓内无 `*.service` 静态文件,靠模板渲染) |
| `.github/workflows/*.yml`       | `.github/workflows/ci.yml`, `release.yml`                                 | 见 P0-6/P1-5                                     |
| `curl\|bash`+sha256/gpg         | 仅 sha256 同源,无 gpg                                                     | P0-1                                             |
| sudo 提权边界                   | `id -u 0` 强制 root                                                       | P1-1                                             |
| SHA pin / permissions / secrets | tag 浮动,顶层 permissions                                                 | P0-6/P1-5                                        |

_本报告仅覆盖维度4 (部署与运维),未涉及维度1-3/5 的代码级问题。_

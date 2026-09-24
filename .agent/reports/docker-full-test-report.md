# 容器化全量测试报告（Dockerfile + docker compose）

日期：2026-09-24 · 仓库：`zhang123999-qq/toolbox` · 分支：master · 结论：**全部通过，0 残留失败**

## 一、测试环境（可复现）

| 组成 | 文件 | 说明 |
| --- | --- | --- |
| 测试镜像 | `deploy/docker/Dockerfile.test` | `node:24-bookworm-slim`（Chromium 需要 glibc，alpine 装不了官方包）+ pnpm 12.3.4（`packageManager` 为准）+ chromium + nginx-light + curl |
| 部署镜像 | `deploy/docker/Dockerfile`（既有） | 构建 → nginx 运行，端口 8081 |
| 编排 | `deploy/docker/docker-compose.test.yml` | `web`（部署链路，healthy 后才跑测试）+ `test`（跑全量） |
| 驱动 | `deploy/docker/run-tests.sh` | 17 个阶段独立记日志，失败不中断后续阶段 |
| HTTP 冒烟 | `deploy/docker/smoke.mjs` | 状态码 / content-type / 预渲染 / 404 语义 / SEO 产物 / JS 产物 |
| 部署脚本机检 | `deploy/docker/verify-deploy-scripts.sh` | `bash -n` + 发布源一致性 |

复现命令（两行）：

```bash
docker compose -f deploy/docker/docker-compose.test.yml build
ROUND=round1 docker compose -f deploy/docker/docker-compose.test.yml run --rm test
```

日志：`.agent/test-logs/<轮次>/{*.log,summary.tsv}`（卷挂载，容器删除不丢）。

## 二、逐轮结果

| 轮次 | 阶段 PASS/FAIL | 失败项 |
| --- | --- | --- |
| R0（环境搭建） | — | 6 个镜像构建问题，见 §三 |
| R1 | 11 / 2 | `gate-deploy-scripts`、`smoke-preview` |
| R2 | 15 / 1 | `deploy-nginx`（`getgrnam("nobody") failed`） |
| R3 | 15 / 1 | `deploy-nginx`（`NGINX_GROUP: parameter not set`） |
| R4 | 15 / 2 | `deploy-nginx`（全站 403）、`smoke-nginx`（slug 写错） |
| R5 | **17 / 0** | — |
| R6（含文档改动后的复跑） | **17 / 0** | — |

> R1 的日志因 Git Bash 路径转换没落到挂载卷（`-e LOG_DIR=/app/...` 被改写为 Windows 路径），
> 已在后续轮次用 `MSYS_NO_PATHCONV=1` 修正；R1 的两条失败结论在 §三有完整留存。

## 三、失败 → 根因 → 修复（逐条）

### R0 · 镜像构建阶段

| # | 现象 | 根因 | 修复 |
|---|---|---|---|
| R0-1 | `failed to fetch anonymous token ... Bad Gateway` | Docker 守护进程内部代理间歇性失败 | 重试即可；记录为已知环境抖动 |
| R0-2 | `Command "playwright" not found` | `@playwright/test` 是 `apps/web` 的依赖，pnpm `exec` 只解析当前包的 `.bin` | `cd apps/web && pnpm exec playwright install ...` |
| R0-3 | apt 拉 `deb.debian.org` 报 `unexpected EOF` | 容器内无代理，官方源被限速/中断 | 换 Debian 镜像站 |
| R0-4 | `host.docker.internal:10808` 不可连 | 宿主机代理只监听 127.0.0.1，容器经网关 IP 访问不到 | 放弃容器内走宿主代理，改走可达镜像源 |
| R0-5 | 换镜像站后仍 `Connection failed [...:80]` | apt 用的是**明文 http**，本网络只放行 443 | sed 连协议一起换为 `https://` |
| R0-6 | `No system certificates available` | slim 镜像连 `/etc/ssl/certs` 都没有，https apt 无法校验证书 | 借 node 自带根证书拉 `cacert.pem` 落盘，再 `apt-get install ca-certificates` |
| R0-7 | `cdn.playwright.dev` 连接超时 | 官方 CDN 不可达 | `PLAYWRIGHT_DOWNLOAD_HOST=https://registry.npmmirror.com/-/binary/playwright` |
| R0-8 | 每改一行源码都要重下 15 分钟 chromium | `COPY . .` 排在昂贵层之前 | 把 `COPY . .` 移到 chromium / nginx 之后；`run-tests.sh` 开头补一次 `pnpm install --frozen-lockfile` 兜住依赖漂移 |

### R1 · 两条失败

1. **`gate-deploy-scripts` FAIL**
   - 现象：`verify-nginx-config.sh: 用法: verify-nginx-config.sh <bundle.tar.gz> [port]`
   - 根因：我新写的机检脚本把它当无参脚本调用；它实际需要「bundle 包 + 本机 nginx」
   - 修复：从机检脚本里移除该调用，改为 `run-tests.sh` 里的独立阶段 `deploy-nginx`（先打 bundle，再跑，端口 8088）
2. **`smoke-preview` FAIL**（`GET /definitely-not-a-real-page/ -> 200`，期望 404）
   - 根因：**断言写错了，不是产品问题**。`vite preview` 自带 SPA 回退，未知路径返回 200 + 应用外壳；
     硬 404 是 nginx（`try_files ... =404`）的语义
   - 修复：`smoke.mjs` 改为环境感知（`SMOKE_SPA_FALLBACK=1` 按回退断言，否则按硬 404 断言并校验 404 页内容）。
     **没有放宽 nginx 那一侧**——nginx 仍要求硬 404

### R2 · `deploy-nginx` FAIL：`getgrnam("nobody") failed`（**真 Bug**）

- 现象：`toolboxctl render --nginx-user nobody` 渲染出的配置 nginx `-t` 直接失败
- 根因：`nginx.conf.tpl` 写的是 `user @NGINX_USER@;`；nginx 的 `user` 指令省略组时会**拿用户名当组名**，
  而 Debian / Ubuntu 上 `nobody` 的组叫 `nogroup` → 组解析失败。
  影响的是**真实降级路径**：`useradd` 不可用时 `toolboxctl` 会回落到 `nobody`，
  在目标机（Ubuntu 24.04）上整条安装链路会断在这里
- 修复：模板改为 `user @NGINX_USER@ @NGINX_GROUP@;`；`toolboxctl` 新增 `NGINX_GROUP`，
  由 `render_tpl` 在降级到 `nobody` 时探测（`nobody` → `nogroup`）后填入

### R3 · `deploy-nginx` FAIL：`NGINX_GROUP: parameter not set`

- 现象：上一条修复引入的新失败
- 根因：`toolboxctl` 开头是 `set -eu`，`NGINX_GROUP` 只在使用处被引用、未在默认值区初始化
- 修复：默认值区加 `NGINX_GROUP=`（空串），并注释说明「`set -u` 下必须先初始化」

### R4 · 三条失败

1. **compose 起不来**：`dependency failed to start: container toolbox-web-test is unhealthy`
   - 现象：`curl http://127.0.0.1:8081/` 明明 200，但容器就是不健康
   - 根因：healthcheck 用 exec 数组形式写 shell 重定向 —— `">/dev/null"` 被当成**第三个 URL** 传给 `wget`，
     wget 解析失败 → 退出非 0 → 永远 unhealthy
   - 修复：改成不带重定向的 `["CMD","wget","-q","-O","/dev/null","http://127.0.0.1/"]`；
     `docker-compose.dev.yml` 有同一处写法，一并修
2. **`deploy-nginx` 全站 403**（**真 Bug，最严重**）
   - 现象：除 `/healthz` 外所有路径 403；nginx 错误日志 `stat() ".../app/" failed (13: Permission denied)`
   - 根因：目录权限链上 `releases/<版本>` 是 `drwx------`。
     源头在 `build-bundle.sh`：`STAGE` 来自 `mktemp -d`（模式 **0700**），
     `tar -czf ... -C "$STAGE" .` 把这条 `./` 目录项的模式原样记进归档，
     解包后 `releases/<版本>` 就是 0700，nginx worker（nobody / toolbox）无法穿越
   - 影响范围：**任何通过一键安装 / upgrade 装的站点都会全站 403**，
     且只有 `/healthz` 正常——健康检查会误报「部署成功」，是最坏的失败形态
   - 修复：打包前 `chmod 0755 "$STAGE"` 并 `find "$STAGE" -type d -exec chmod 0755 {} +`
3. **`smoke-nginx` FAIL**：`/tools/case-converter/ -> 404`
   - 根因：**我的冒烟用例写错了 slug**，catalog 真值是 `case-convert`。
     preview 因为有 SPA 回退返回 200 掩盖了它，只有真 nginx 才暴露
   - 修复：改用 catalog 真值 slug，并在注释里写明「slug 必须是 `apps/web/src/tools/<id>/` 的目录名」

### 部署镜像构建失败（独立于测试轮次）

- 现象：`pnpm install` 全程 `tunnel error ... Connection refused (os error 111)`，耗 18 分钟后失败
- 根因：compose 把宿主机的 `HTTP_PROXY`（`127.0.0.1:51849`）透传进构建容器；
  容器里的 `127.0.0.1` 是它自己，代理端口根本不存在
- 修复：改为显式 opt-in（`DOCKER_BUILD_HTTP_PROXY`，默认空），并在 compose 里写明为什么不能透传

## 四、最终通过率

| 项目 | 结果 |
| --- | --- |
| 阶段 | **17 / 17 通过**（round5、round6 连续两轮） |
| 单元 + 组件测试（vitest） | **1179 / 1179**，157 个文件 |
| E2E（Playwright，真实 Chromium） | **231 / 231**，75 个 spec |
| 二进制部署链路（真起 nginx） | **32 / 32** 断言 |
| 产物冒烟（preview） | **15 / 15** |
| 产物冒烟（compose 的 nginx 服务） | **16 / 16** |
| 用例级合计 | **1473 / 1473 = 100%** |
| 部署服务实测（宿主机 curl，8081） | `/` 200 · `/tools/json-formatter/` 200 · `/tools/case-convert/` 200 · `/c/dev/` 200 · `/sitemap.xml` 200 · `/robots.txt` 200 · `/nope-xyz/` **404** |

**没有跳过、注释或屏蔽任何用例**：全过程中唯一被修改的断言是「preview 的 404 语义」，
原因是该断言本身写错了环境语义（nginx 侧的硬 404 断言不仅保留，还加了 404 页内容校验）。

## 五、修复清单（文件级）

| 文件 | 改动 |
| --- | --- |
| `deploy/docker/Dockerfile.test` | 新增。测试镜像：Node 24 + pnpm 12.3.4 + chromium + nginx；apt 走 https 镜像站并补 CA；`COPY . .` 放昂贵层之后 |
| `deploy/docker/docker-compose.test.yml` | 新增。`web`（部署）+ `test`（全量）；代理改显式 opt-in；healthcheck 修掉 exec 形式重定向 |
| `deploy/docker/run-tests.sh` | 新增。17 阶段驱动 + 逐阶段日志 + `summary.tsv` |
| `deploy/docker/smoke.mjs` | 新增。HTTP 冒烟，404 语义按环境区分，slug 用 catalog 真值 |
| `deploy/docker/verify-deploy-scripts.sh` | 新增。部署脚本机检（语法 + 发布源一致性） |
| `.dockerignore` | 新增。排掉 `node_modules` / `dist` / `.git` / `.agent` 等 |
| `deploy/docker/docker-compose.dev.yml` | healthcheck 同一处写法修复 |
| `deploy/binary/packaging/nginx.conf.tpl` | `user` 指令补 `@NGINX_GROUP@` |
| `deploy/binary/toolboxctl` | 新增 `NGINX_GROUP` 与 `group_exists()`，渲染时按系统补齐组名 |
| `deploy/binary/build-bundle.sh` | 打包前把 staging 及子目录修成 0755（修全站 403） |
| `apps/web/playwright.config.ts` | `retries` 可由 `E2E_RETRIES` 控制（容器里设为 0，严格模式） |
| `.gitignore` / `.prettierignore` | 忽略 `.agent/test-logs/` |
| `docs/DEVELOPMENT.md` / `.en.md` | 新增 §二十一「容器化全量测试（可复现）」 |
| `CHANGELOG.md` | 记录新增项与 4 条修复 |

## 六、仍未解决的问题与影响范围

1. **镜像构建依赖外网，且首次很慢**：chromium（约 114MB）在受限网络下要十几分钟。
   已通过层顺序优化，使后续每轮重建只需 ~20 秒；但**首次构建**仍受网络制约。
   影响范围：新机器首次跑测试；不影响 CI（GitHub Actions 网络正常，且 CI 不跑 E2E）。
2. **E2E 未纳入 GitHub Actions CI**：CI 目前只跑 `pnpm verify` + `build:ssg`，
   容器化 E2E 需要 `docker compose`，尚未加进 workflow。
   影响范围：PR 合入前不会自动跑真实浏览器流程，需人工执行本文 §一的两条命令。
3. **R1 日志丢失**：Git Bash 下未设 `MSYS_NO_PATHCONV=1` 导致日志写进容器内错误路径。
   已在 R2 起修正；R1 的结论保留在本报告与提交信息中。影响范围：仅历史记录。
4. **基础镜像拉取偶发 `Bad Gateway`**：Docker 守护进程内部代理不稳定，重试可过。
   影响范围：本机首次构建；已有镜像后不再触发。
5. **未覆盖**：Windows 原生路径（本项目以容器 / Linux 为准）、870 个工具中尚未实现的
   795 个（当前 75 个），以及 Safari / Firefox 浏览器矩阵（E2E 只跑 Chromium）。

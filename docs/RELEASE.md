# 发布流程（Release）

本项目**不是 Go 项目**：全部代码为 TypeScript（Vite + React 19），
构建产物是纯静态文件，不存在 Go 二进制、`go.mod` 或 Go 工具链依赖。
因此「构建 Release」在本项目里的含义是：
**把预构建好的静态产物 + 部署工具打成一个自包含 bundle，作为 Release 附件发布**，
使用户无需源码与构建工具链即可安装（即「二进制部署」，与「源码部署」相对）。

> 若将来确实需要单文件服务器二进制，可用 Docker 内的 `golang:alpine` 交叉编译
> 后并入 bundle，无需在本机安装 Go；当前版本用系统 nginx 承担这一角色。

## 一、版本号的标识方式

版本号有**五个落点**，必须一致，脚本已尽量自动对齐：

| 落点                      | 值                                      | 由谁写入            | 用途                         |
| ------------------------- | --------------------------------------- | ------------------- | ---------------------------- |
| `deploy/binary/VERSION`   | `0.0.1-beta`                            | 手工（真源）        | 打包与 CLI 版本号的唯一来源  |
| bundle 文件名             | `toolbox-0.0.1-beta-linux-amd64.tar.gz` | `build-bundle.sh`   | 用户可见、升级源按名解析版本 |
| bundle 内 `VERSION`       | `0.0.1-beta`                            | `build-bundle.sh`   | 安装时校验「包内版本」       |
| bundle 内 `manifest.json` | `"version": "0.0.1-beta"` + `gitCommit` | `build-bundle.sh`   | 追溯「这个包出自哪个提交」   |
| git tag / Release         | `v0.0.1-beta`                           | `gh release create` | 与源码历史绑定               |

运行时还提供一个**自证**落点：`GET /healthz` 返回 `ok v0.0.1-beta`。
它由 nginx 配置在渲染期写死，因此能证明「当前真正在跑的是哪个版本」，
是升级/回滚判定的依据（见第四节）。

约定：

- 采用**语义化版本** `MAJOR.MINOR.PATCH`；`0.y.z` 表示尚未稳定。
- 打 tag 时带 `v` 前缀（`v0.0.1-beta`），资产文件名不带 `v`（`toolbox-0.0.1-beta-…`）；
  一键安装脚本会自动去掉前缀做映射。
- `deploy/binary/VERSION` 是打包 / 文件名 / bundle 内版本 / `/healthz` 的唯一真源；
  各 workspace 的 `package.json` 版本号在发版时**同步**为同一版本（供工具链与包元数据使用），
  一律以 `VERSION` 为准对齐，避免两处漂移。

## 二、发布流程（推 tag 全自动，无需手工打包 / 上传）

发布已由 CI 工作流 `.github/workflows/release.yml` 全自动完成：**不需要在开发机手工打包，
也不需要手工 `gh release create` / `gh release upload`**。推送 `v*` tag 后，工作流在
Linux（ubuntu-latest）上依次执行：安装依赖 → `pnpm build:ssg`（sitemap → client → SSR →
prerender）→ `deploy/binary/build-bundle.sh --skip-build` → 从 CHANGELOG 提取该版本说明
创建 Release（CHANGELOG 缺该段时回落到 GitHub 自动生成说明）→ 上传全部附件
（`gh release upload --clobber`，可重入）。

```bash
# 1. 改版本号 + 写 CHANGELOG
#    真源：deploy/binary/VERSION；各 workspace package.json 同步为同一版本
echo 0.0.2 > deploy/binary/VERSION
#    手工把 CHANGELOG.md 的「未发布」段改为 `## [0.0.2] - YYYY-MM-DD`

# 2. 提交并推到 master，先让 CI 门禁（pnpm verify / build:ssg）跑绿
git add -A && git commit -m "chore(release): v0.0.2"
git push origin master

# 3. 打附注 tag 并推送 —— 这一步即触发自动发布，无需任何后续手工动作
git tag -a v0.0.2 -m "v0.0.2"
git push origin v0.0.2
# 在 https://github.com/zhang123999-qq/toolbox/actions 查看 Release 工作流；
# 成功后 Release 与 5 个附件自动就绪：
#   toolbox-0.0.2-linux-amd64.tar.gz / .tar.gz.sha256 / latest.txt / index.json / install.sh
```

> 打包发生在 CI 的 Linux runner 上，开发机不必具备 tar/gzip/sha256sum 等 Linux 工具链。
> 仍想在本地出包做验证（可选）可跑 `deploy/binary/build-bundle.sh`（默认先 client→SSR→
> prerender，产物在 `dist-release/`），但**不要手工上传**，对外发布一律以 CI 产物为准。
> 容器内验证 nginx 配置（可选，不需要 systemd）：
> `docker run --rm -v "$PWD:/w" -w /w nginx:1.27-alpine sh
/w/deploy/binary/tests/verify-nginx-config.sh
/w/dist-release/toolbox-0.0.2-linux-amd64.tar.gz`

### 给已存在的 tag 补发 / 刷新附件（仅兜底，不用于常规发布）

Release 已存在但附件缺失（历史漏传）时，无需删除 Release，手动重跑一次工作流即可：
仓库 **Actions → Release → Run workflow → 填 tag（如 `v0.0.2`）**。该路径会保留现有
Release 说明，仅以 `--clobber` 刷新 5 个附件。v0.0.2 曾因缺 `latest.txt` 导致
`toolboxctl upgrade` 报「无法解析可用版本」，即由此途径补齐。

> **tag 的两个细节**（首次发布时踩到过）：
>
> 1. `git tag -a` 需要提交身份。本机未配置全局 `user.name/user.email` 时会直接失败
>    （`Committer identity unknown`）。用
>    `git -c user.name=… -c user.email=… tag -a …` 临时传入即可，不必改全局配置。
> 2. 若 tag 不存在就直接跑 `gh release create <tag>`，gh 会**自己创建一个轻量 tag**
>    并指向默认分支 HEAD——发布能成功，但 tag 上没有说明信息。
>    想要带说明的附注 tag（推荐），必须**先 `git tag -a` 并 push tag**，再建 Release。

产物清单（`dist-release/`）：

| 文件                               | 大小   | 说明                                 |
| ---------------------------------- | ------ | ------------------------------------ |
| `toolbox-<ver>-linux-amd64.tar.gz` | ~145KB | 自包含部署包（48 个文件）            |
| `…tar.gz.sha256`                   | 99B    | 整包校验值；安装/升级前必校验        |
| `latest.txt`                       | —      | 最新版本号，升级源比对版本用         |
| `index.json`                       | —      | 已发布版本索引（版本/文件名/sha256） |

bundle 内部：`app/`（静态产物）、`bin/toolboxctl`（管理 CLI）、
`conf/`（nginx 主配置模板 / systemd unit 模板 / MIME 表）、
`VERSION`、`manifest.json`、`checksums.txt`（逐文件 sha256）、`README.md`。

## 三、changelog 的撰写要点

本项目用仓库根的 [`CHANGELOG.md`](../CHANGELOG.md)，遵循 Keep a Changelog

- 语义化版本。写的时候注意：

1. **面向使用者，不面向提交历史**。「新增 json-formatter」对人有用，
   「重构 utils.ts」没意义——后者属于 commit message。
2. **按类型分组**：`新增 / 变更 / 修复 / 移除 / 安全 / 已知限制`。
   同一版本内不要按提交顺序平铺。
3. **每条写「影响」**：说清用户侧变化（能做什么、以前为什么不行），
   必要时给出迁移动作。例如「未知路径从 200 改为 404（软 404 会污染索引）」比
   「修 try_files 兜底」有用得多。
4. **「未发布」区块常驻**：开发中随手往里加，发版时改标题为版本号+日期，
   再新建一个空的「未发布」。
5. **必须显式写「已知限制」**。项目里英文文案只覆盖 1 个工具、
   无 `/en` 路由、首屏 JS 超预算等待决项，都写在 0.0.1-beta 的已知限制里——
   不写等于让用户替你发现。
6. **链接化**：版本标题指到对应 Release，`未发布` 指到 compare 链接。
7. **Release notes 直接用 changelog 的对应段落**（`--notes-file`），
   避免两处各写一份互相漂移。

## 四、一键安装脚本的设计

`deploy/binary/install.sh`，支持「下载即执行」。脚本作为 **Release 附件**一并发布，
因此入口地址不随分支变化（进仓库根 `README.md` 的「快速开始」也是这一条）：

```bash
# ① GitHub Release 资产（推荐入口：与 tag 绑定，分支改名/删除都不影响）
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh \
  | sudo bash

# ② 指定版本 / 端口 / 自动装依赖
curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/download/v0.0.1-beta/install.sh \
  | sudo bash -s -- --version 0.0.1-beta --port 9090 --install-deps

# ③ 跟随 master 分支的源码副本（仅便于开发期自测，不推荐作为对外入口）
curl -fsSL https://raw.githubusercontent.com/zhang123999-qq/toolbox/master/deploy/binary/install.sh \
  | sudo bash

# ④ 自建 / 内网发布源（生产推荐：不依赖 GitHub 可达性）
curl -fsSL http://<发布源>/install.sh | sudo bash -s -- --source http://<发布源>
```

> ✅ **仓库已于 2026-09-24 转为 public**：① ② ③ 三条对匿名请求均可访问（已实测 200）。
> 当前 Release（v0.0.1-beta）附件里的 `install.sh` **已同步为仓库内最新版本**，
> 因此「对外一键安装入口」与「源码」不会再出现版本漂移。
>
> - 仍需离线分发时走 ④ 自建 / 内网发布源 —— 生产环境首选，顺带解决内网机器无外网的问题。
> - 私有化部署时可继续用 token：`curl … | sudo GITHUB_TOKEN=ghp_xxx bash -s -- …`
>   （`install.sh` 会把 token 加到 `Authorization: Bearer` 上，也用于取 `api.github.com` 的 latest）。
>
> 无论走哪条，**「一键安装入口」固定指向 ①**（Release 附件），而不是 master 上的源码副本：
> 前者跟随 tag、可回溯，后者会随分支演进而变。
>
> 环境变量可覆盖内建默认值：`TOOLBOX_REPO`（默认 `zhang123999-qq/toolbox`）；
> 升级源的默认值随之为 `https://github.com/$TOOLBOX_REPO/releases/latest/download`。

设计要点：

| 决策                                                | 原因                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **先校验 sha256 再解包**，缺 `.sha256` 直接拒绝安装 | 单条 curl 命令意味着用户放弃了审阅脚本的机会，校验是唯一防线；`--dry-run` 可先预览动作 |
| 真正的落地逻辑**全部交给 bundle 内的 `toolboxctl`** | 「一键装」与「手动解包装」走同一条代码路径，行为不会分叉；脚本只负责下载/校验/解包     |
| 无交互                                              | `curl \| sh` 场景下 stdin 被脚本占用，任何 `read` 都会吞掉脚本内容                     |
| 支持 `--source` 内网源                              | 内网机器常无外网；也让「在线升级」与「首次安装」共用同一个发布源                       |
| 支持 `GITHUB_TOKEN`                                 | 私有化部署 / 自建仓库取 Release 资产仍需认证；本仓库已公开，匿名即可                   |
| 架构自动判定，不支持的架构明确报错                  | 避免装出跑不起来的包                                                                   |
| 以 `id -u` 判定并要求 root                          | 安装要写 `/opt`、装 systemd unit，必须 root，早失败早提示                              |

## 五、支持的平台与依赖要求

| 项         | 要求                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| 目标机 OS  | Linux（x86_64 / aarch64）                                               |
| 产物性质   | 纯静态文件，**架构无关**；`arch` 仅用于文件名与 manifest 校验           |
| init       | systemd（`/run/systemd/system` 存在）                                   |
| Web 服务器 | nginx（1.21+；可用 `install --install-deps` 自动 apt 安装）             |
| 基线命令   | `tar` `gzip` `sha256sum` `awk` `sed` `sh`(POSIX)                        |
| 联网       | 只有「在线升级 / curl 直装」需要 `curl` 或 `wget`；离线可用本地目录作源 |
| 权限       | root（安装、卸载、服务管理）                                            |
| **不需要** | Go、Node、pnpm、Docker、Python                                          |

开发机（打包用）：Node ≥ 22.22 与 pnpm（跑构建），bash、`tar`、`sha256sum`。

## 六、内网/目标服务器的访问与部署方式

当前环境的实际拓扑与约束（已实测）：

```
开发机 (Windows, F:/max)
   │  git push 走 127.0.0.1:10808 代理 → GitHub
   │  ssh/scp 直连内网
   ▼
目标机 192.168.100.4  (Ubuntu 24.04.5, x86_64, systemd 255, Docker 29.7, nginx 1.24)
   └─ toolbox.service : 独立 nginx 实例，监听 :8081，root=/opt/toolbox/current/app
```

- **访问方式**：`http://192.168.100.4:8081/`（内网直连；`/healthz` 可查版本）。
  从开发机验证时需绕开系统代理：`curl --noproxy '*' http://192.168.100.4:8081/`。
- **首次部署**（内网无外网时）：
  `scp dist-release/* root@192.168.100.4:/root/tb-upload/`
  → 解包 → `install --from <包> --install-deps`。
- **在线升级**：把 `dist-release/` 用任意静态服务器托管（本例用
  `python3 -m http.server 8899 --directory /srv/toolbox-releases`）作为发布源，
  目标机执行 `toolboxctl upgrade --source http://<发布源>`。
- **关于 `192.168.200.4` 代理**：本流程**不需要**它。`gh` 与 `git push`
  已能通过开发机本地代理 `127.0.0.1:10808` 完成；把带认证的推送绕经一个
  额外代理没有收益，只增加凭据暴露面。仅当开发机到 GitHub 完全不通、
  且该代理确为受控出口时，才应考虑使用。

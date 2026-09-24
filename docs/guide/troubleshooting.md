# 排障

> **中文** | [English](troubleshooting.en.md)
> 下面每一条都是**实际踩过并修掉的**，不是凭想象的清单。按「症状 → 原因 → 处理」组织，
> 可以直接搜症状关键词。

---

## 一、先跑自检

多数问题在这一步就会自己说清楚：

```bash
toolboxctl doctor            # 目标机：依赖 / 端口 / 磁盘 / 权限 / 服务状态
toolboxctl status            # 版本是否一致、健康是否通过
pnpm verify                  # 开发机：元数据 + 文档 + lint + 格式 + 类型 + 测试
```

---

## 二、安装类问题

| 症状                                                  | 原因                                                  | 处理                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `缺少校验文件 …tar.gz.sha256 —— 出于安全考虑拒绝安装` | 发布源目录里漏了 `.sha256`                            | 补齐校验文件；这是刻意设计，不要绕过                                                          |
| `下载失败：…` 且假名指向 GitHub                       | 版本不存在、网络不通，或误加了 `--proxy` / `--mirror` | 用 `--version` 指定已发布的版本、加 `--proxy http://127.0.0.1:10808`，或改用自建 / 内网发布源 |
| `端口 80 已被占用：…`                                 | 机器上已有服务占用                                    | `--port 8080`，或先释放端口                                                                   |
| `不支持的架构：…`                                     | 只发布 amd64 / arm64                                  | 换机器，或在有对应工具链的机器上自行打包                                                      |
| 卡在「健康检查」然后失败                              | 服务起不来，或端口被别的进程抢了                      | `toolboxctl logs -n 100` 看 nginx 报错                                                        |
| `apt-get install nginx` 失败                          | 目标机无外网或源不可达                                | 预装 nginx 后去掉 `--install-deps`                                                            |
| 装完 `toolboxctl` 命令找不到                          | 未用 root 安装，或 PATH 未含 `/usr/local/bin`         | `ls -l /usr/local/bin/toolboxctl`；用绝对路径调用                                             |

---

## 三、运行类问题

| 症状                                             | 原因                                                                  | 处理                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/healthz` 无响应                                | 服务未起 / 端口不对                                                   | `systemctl status toolbox.service`、`journalctl -u toolbox.service -n 50` |
| 首页返回 `application/octet-stream`，gzip 也失效 | nginx 的 server 级 `types { }` 会**覆盖**从 http 级继承的整张 MIME 表 | 删掉 server 级 `types { }`，直接继承 `/etc/nginx/mime.types`              |
| `/tools` 返回 301 跳 `/tools/`                   | `try_files` 里用了 `$uri/`，触发目录自动补斜杠                        | 改用 `$uri/index.html`                                                    |
| 未知路径返回 200 且显示首页                      | 兜底写成了 `/index.html`，形成「软 404」                              | 兜底用 `=404` + `error_page 404 /404.html`                                |
| 工具页对爬虫是空的                               | SPA 未预渲染                                                          | 跑 `pnpm build:ssg`，或检查镜像里是否含 SSG 步骤                          |
| `.wasm` 加载失败                                 | MIME 不是 `application/wasm`                                          | nginx 1.21+ 自带该类型；确认没有多余的 `types { }`                        |

---

## 四、升级与回滚

| 症状                                       | 原因                                                                                                                      | 处理                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 升级明明成功却报「健康检查失败」并自动回滚 | `systemctl reload` 只把 HUP 交给 nginx master，master **异步**重读配置；此前旧 worker 仍在服务，`/healthz` 仍返回旧版本串 | 健康检查必须**按目标版本号轮询**确认；旧版本包里若还是「探一次就下结论」，用新包升级 |
| `status` 显示版本不一致                    | 配置 / `current` 软链 / `/healthz` 三处对不上，说明上次升级或回滚中断过                                                   | `toolboxctl rollback` 回到上一个可用版本，再重新升级                                 |
| 回滚后仍不健康                             | 旧版本本身也有问题，或配置被改坏                                                                                          | `toolboxctl logs`；必要时 `uninstall` 后重装                                         |
| 升级后配置没变                             | 升级只切 `current` 软链，不会覆盖 `toolbox.conf`                                                                          | 手工改 `toolbox.conf` 后 `toolboxctl reload`                                         |

---

## 五、开发类问题

| 症状                                          | 原因                                                                          | 处理                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `turbo` 报 `os error 231`                     | 并发 spawn 超出 Windows 沙箱管道上限                                          | `--concurrency=1`（`pnpm build/typecheck/test` 已内置）             |
| `pnpm install` 报 esbuild postinstall `EBUSY` | 构建脚本 spawn 失败；二进制其实来自平台包                                     | `pnpm install --ignore-scripts`                                     |
| 构建时报无法清空 `dist/`                      | 产物累积过多触发批量删除保护                                                  | 前台 `rm -rf dist dist-ssr` 后再构建                                |
| `react-router` 报找不到 Router 上下文         | `pnpm add react-router` 装成 8.x，与 `react-router-dom` 内置的 7.x 形成双实例 | 锁 `react-router@^7.1.1`                                            |
| 改了 `meta.ts` 但英文标题不生效               | 没重跑生成器，`tools.generated.ts` 落后于源                                   | `pnpm generate:catalog`                                             |
| 首屏加载了整包工具代码                        | `manualChunks` 只命名了工具 chunk，共享模块被塞进首个命名 chunk               | 显式把 `src/(i18n\|theme\|lib)` 归入 `app-core`                     |
| 预渲染产物全是「加载中…」                     | `renderToString` 遇到 `React.lazy` 只会输出 Suspense fallback                 | 用 React 19 的 `prerender`（`react-dom/static`）                    |
| 文档校验报「断链 / 锚点不存在」               | 改了标题或移动了文件，引用没同步                                              | 按 `pnpm check:docs` 的输出逐条修；跨节引用优先用显式 `<a id>` 锚点 |

---

## 六、提 Issue 前请附上

```bash
toolboxctl version && toolboxctl doctor && toolboxctl status
toolboxctl logs -n 100
uname -a && cat /etc/os-release | head -3
```

开发机上的问题请一并给出 `pnpm verify` 的完整输出、Node 与 pnpm 版本，
以及是否能稳定复现。**能复现**比描述得多详细都有用。

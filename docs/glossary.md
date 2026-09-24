# 术语表

> **中文** | [English](glossary.en.md)
> 本文是**术语的唯一真源**：中英对照、并显式登记「禁用译法」。
> 禁用译法不是建议，而是被 `pnpm check:docs` 机检的约束——写在英文文档里会直接报错。

---

## 一、这份表为什么存在

双语文档真正的风险不是「没翻译」，而是**两边各自演进后悄悄漂移**：

| 漂移形态                                                | 后果                                 |
| ------------------------------------------------------- | ------------------------------------ |
| 同一个概念被翻成两种说法（域 → category / domain 混用） | 读者以为是两个东西，检索也搜不全     |
| 一边新增章节，另一边没跟上                              | 英文读者拿到的是过期信息，且没人发现 |
| 改了标题，别的文档指过来的锚点全失效                    | 链接静默跳到页首，阅读路径断掉       |

这些都不是靠「认真一点」能防住的，只能靠**把术语变成机器可读的数据、把结构变成可断言的约束**。
本文的第 3 列是给读者看的，第 4 列是给校验脚本读的。

---

## 二、产品与架构术语

| 中文       | English             | 说明                                           | 禁用译法                                      |
| ---------- | ------------------- | ---------------------------------------------- | --------------------------------------------- |
| 工具库     | Toolbox             | 产品名（单数、首字母大写），同时是仓库名       | Tool Library, Toolkit                         |
| 工具       | tool                | 单个可用的纯前端小工具                         | utility, widget                               |
| 工具页     | tool page           | 每个工具的路由页 `/tools/<slug>`               | toolpage, tool-page                           |
| 域         | category            | 一级分类，共 20 个，对应 `category` slug       | domain category, domain taxonomy              |
| 大组       | group               | 4 个用户心智分组：dev / design / office / life | major group, big group                        |
| 子类       | sub-category        | 60+ 二级分组，只作筛选器，不建独立页           | subcategory, sub category                     |
| 纯前端     | client-side         | 全部逻辑在浏览器执行，无服务端计算             | pure front-end, pure frontend, front-end only |
| 本地优先   | local-first         | 数据不离开设备                                 | local first, local priority                   |
| 数据不上传 | nothing is uploaded | 隐私主张的准确表述                             | no data upload, data is not uploaded          |
| 免登录     | no sign-in          | 无需账号                                       | no login, login-free                          |
| 明暗主题   | light/dark theme    | 两套主题且可切换。只说「暗色」会漏掉一半功能   | dark mode                                     |
| 预渲染     | pre-rendering       | 构建期产出静态 HTML（SSG）                     | prerenderization                              |
| 真源       | source of truth     | 唯一权威数据来源                               | truth source                                  |
| 元数据     | metadata            | 每个工具的 `meta.ts` 字段                      | meta data, meta-data                          |

---

## 三、工程与流程术语

| 中文            | English                  | 说明                                                       | 禁用译法                                |
| --------------- | ------------------------ | ---------------------------------------------------------- | --------------------------------------- |
| 一条命令安装    | one-line install         | 单条 `curl` 完成下载与安装。强调「一行命令」而非「点一下」 | one-click install, one click install    |
| 二进制部署      | binary deployment        | 交付预构建产物，目标机无需源码与工具链                     | compiled deployment                     |
| 部署包          | bundle                   | 自包含的 tar.gz 产物                                       | package archive                         |
| 在线升级        | online upgrade           | 从发布源拉取新版本并切换                                   | live upgrade, OTA upgrade               |
| 回滚            | rollback                 | 切回上一个可用版本                                         | revert to                               |
| 独立 nginx 实例 | dedicated nginx instance | 自带 pid / 日志 / 临时目录，不读 `/etc/nginx`              | separate nginx instance, isolated nginx |
| 发布源          | release source           | 提供 `latest.txt` 与包的目录或 HTTP 基址                   | publish source, distribution point      |
| 门禁            | gate                     | 提交前必须通过的检查项                                     | quality barrier                         |
| 铺量            | scale out                | 小批量验证后批量生成剩余工具                               | pave, spread                            |
| 首帧闪动        | first-paint flash        | 预渲染内容与用户偏好在首帧不一致导致的闪烁                 | FOUC, flicker                           |
| 骨架            | skeleton                 | 阶段 0 的工程基座                                          | framework skeleton                      |
| 自检            | doctor                   | `toolboxctl doctor`，检查依赖 / 端口 / 磁盘 / 权限         | self-test, selfcheck                    |

---

## 四、文档写作约定

| 约定         | 要求                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| 文件名       | kebab-case 纯 ASCII（`getting-started.md`）；中文名放 H1 与索引表，避免中文路径在 git / 脚本中的转义成本 |
| 英文版后缀   | `<name>.en.md`，与中文版同目录同级；不建 `en/` 子目录（避免两套目录树各自漂移）                          |
| 语言切换入口 | 每份文档顶部第一行：`> **中文** \| [English](x.en.md)`，两份互相指向                                     |
| 章节编号     | 中文用「一、二、三」，英文用「1. 2. 3.」；**同一份文档的章节数必须两边一致**                             |
| 代码块数量   | 成对文档的代码块数量必须一致（结构对齐的可机检代理指标）                                                 |
| 相对链接     | 一律相对路径；跨目录用 `../`，不写仓库绝对路径                                                           |
| 数字口径     | 「实测」为脚本统计值，「目标」为设计目标；冲突时以实测为准                                               |

---

## 五、机器如何校验

```bash
pnpm check:docs            # 出错退出码 1
pnpm check:docs --strict   # 连警告也算失败
```

脚本 `scripts/check-docs.ts` 会做 9 项检查：双语配对、语言切换入口双向存在、
章节与代码块结构对齐、相对链接可达、`path#anchor` 锚点真实存在、
禁用译法未出现、在线体验地址与「尚未上线」标注齐备、
新增文档已进 `docs/README.md` 的文档地图、文件名符合 kebab-case。

前 8 项中，凡是 Tier A（对外文档）的问题一律 **error**；Tier B（工程内部文档）
的问题降为 **warning** 并计数，这样双语推进可以分批进行，而不是卡在一次全量翻译上。

# 使用示例

> **中文** | [English](usage.en.md)
> 本文给的是**可以直接照抄的用法**：先讲浏览器端怎么用，再给命令行，最后给程序化调用。
> 每个示例都附期望结果，方便你判断是否真的成功了。

---

## 一、站点使用（浏览器端）

### 1.1 首页与导航

首页即落地页，从上到下依次是：主视觉与两个主行动按钮、核心亮点、4 大组展示、
20 域速览、已上线工具、底部转化区。顶栏从左到右是站点名、4 个大组入口、全部工具、搜索、
主题开关、语言开关。

| 想做的事          | 操作                                               |
| ----------------- | -------------------------------------------------- |
| 按大组找工具      | 顶栏点 `开发编码 / 设计媒体 / 办公文档 / 生活学习` |
| 按域找工具        | 首页「20 域速览」点任一域，或 `/c/<组>/<域>`       |
| 看全部 870 个工具 | 顶栏「全部工具」或 `/tools`                        |
| 换个入口重来      | 点左上角站点名回首页                               |

### 1.2 全局搜索

按 `Ctrl + K`（macOS 为 `⌘ + K`）打开搜索，输入关键词即可，方向键上下选择、回车跳转、
`Esc` 关闭。搜索命中的是工具标题、标签与描述；索引在构建期由中文元数据生成，
**展示时按当前语言取词**，所以英文模式下也能正常搜中文关键词。

| 按键         | 作用           |
| ------------ | -------------- |
| `Ctrl/⌘ + K` | 打开或关闭搜索 |
| `↑` `↓`      | 上下移动高亮项 |
| `Enter`      | 打开高亮项     |
| `Esc`        | 关闭           |

### 1.3 语言与主题

顶栏右侧的 `中 | EN` 是语言开关，旁边的月亮/太阳图标是主题开关。两者都写在
`localStorage` 里（`toolbox.locale` / `toolbox.theme`），**刷新与下次访问都会记住**。
主题在首次绘制之前就由内联脚本写好，因此不会有「先亮后暗」的闪动；
若记住的语言是英文，页面会先用遮罩挡住预渲染的中文，就绪后再显示，避免「先中文后英文」。

### 1.4 工具页：以 JSON 格式化为样例

访问 `/tools/json-formatter`。左侧是输入、右侧是输出，输入即出结果。

输入这段：

```json
{ "b": 1, "a": [3, 2, 1], "note": "试试缩进和键排序" }
```

期望结果：输出区出现缩进后的 JSON；勾选「键排序」后 `a` 会排到 `b` 前面；
点「压缩」输出变成一行；输入非法 JSON 时输出区显示错误位置而不是静默失败。
每个工具页都有统一的四个动作：复制、下载、清空、示例，以及页脚的可行性说明。

---

## 二、命令行使用示例

### 2.1 日常运维

```bash
toolboxctl status          # 服务 / 版本 / 端口 / 健康一览
toolboxctl list            # 已安装的版本，* 标记当前
toolboxctl logs -f         # 跟踪 journal 与 nginx 日志
toolboxctl backup          # 备份配置与状态
toolboxctl doctor          # 环境自检（依赖 / 端口 / 磁盘 / 权限）
```

`status` 有一行值得特别关注：**版本一致**。它把「配置里写的版本」「`current` 软链指向的版本」
「`/healthz` 自报的版本」三者比对；三者不一致说明升级或回滚中途出过问题。

### 2.2 在线升级

```bash
toolboxctl check-update --source <发布源>   # 先看有没有新版本
toolboxctl upgrade --source <发布源>        # 升级
```

流程是：解析版本 → 下载包与 `.sha256` → 整包校验 → 逐文件校验 → 解包到新目录 →
原子切换 `current` 软链 → 渲染并校验 nginx 配置 → reload → **轮询 `/healthz` 确认新版本真的在服务**。
任何一步失败都会自动切回旧版本，不会停在半路。

### 2.3 回滚

```bash
toolboxctl rollback              # 回到上一个版本
toolboxctl rollback --to 0.0.1   # 回到指定版本
```

回滚同样是「切软链 + 重载 + 健康检查」，做完会打印确认信息；
若回滚后健康检查仍失败，它会明确告诉你，而不是假装成功。

### 2.4 备份与卸载

```bash
toolboxctl backup --output /root/tb-backup   # 备份配置与状态到指定目录
toolboxctl uninstall                         # 卸载站点，保留 nginx 依赖
toolboxctl uninstall --purge --purge-deps     # 连配置、证书目录与 nginx 依赖一起清掉
```

默认 **不** 卸依赖是刻意的：这台机器上可能还有别的站点在用同一个 nginx。

---

## 三、把 catalog 当库用

`@toolbox/catalog` 是纯数据包，不依赖 DOM，可以在构建脚本、CI 或 Node 里直接引用：

```ts
import { CATEGORIES, GROUPS, TOOLS, getTool, groupOfCategory } from '@toolbox/catalog'

const tool = getTool('json-formatter')
console.log(tool?.title, tool && groupOfCategory(tool.category))
console.log({ tools: TOOLS.length, categories: CATEGORIES.length, groups: GROUPS.length })
// 期望：JSON 格式化 dev / { tools: 1, categories: 20, groups: 4 }
```

它是全站真源：路由表、搜索索引、sitemap 都由它派生，所以「文档里写的域数」与
「代码里跑的域数」不可能对不上——对不上时 `pnpm check:tools` 会先失败。

---

## 四、常见任务的完整命令序列

第一次在一台干净服务器上上线：

```bash
curl -fsSL <发布源>/install.sh | sudo bash -s -- --source <发布源> --dry-run   # 先看要做什么
curl -fsSL <发布源>/install.sh | sudo bash -s -- --source <发布源>             # 真装
toolboxctl status                                                            # 确认版本一致
curl -s http://127.0.0.1/healthz                                             # 确认返回 ok v<版本>
```

日常发版与出问题时的回退：

```bash
toolboxctl check-update --source <发布源>
toolboxctl upgrade --source <发布源>
toolboxctl health || toolboxctl rollback    # 健康检查不过就回滚
```

# UA 解析

粘贴一段 User-Agent 字符串，用自研规则匹配出浏览器、版本号、操作系统、
设备类型与渲染引擎。不依赖 ua-parser-js。

## 用途

后端日志里的 UA 串一长串，看不出是谁。本工具拆成「Chrome 126 / Windows 10/11 / 桌面 / Blink」。

## 输入

| 字段   | 类型   | 约束                             |
| ------ | ------ | -------------------------------- |
| `text` | string | User-Agent 串，最大 200,000 字符 |

## 输出

| 字段   | 类型   | 说明                                     |
| ------ | ------ | ---------------------------------------- |
| `text` | string | 浏览器 / 操作系统 / 设备类型 / 引擎 四行 |

```text
浏览器：Chrome 126.0.0.0
操作系统：Windows 10/11
设备类型：桌面
渲染引擎：Blink
```

## 识别规则

- **浏览器**（顺序敏感）：Edge → Opera → Firefox → Chrome → Safari，其余未知
- **操作系统**：Windows NT 版本映射（10.0→Win10/11，6.1→Win7…）、iOS / iPadOS / macOS / Android / Linux
- **设备**：iPad→平板，iPhone/iPod→手机，Android 含 Mobile→手机，其余桌面
- **引擎**：Edge/Chrome/Opera→Blink，Firefox→Gecko，Safari→WebKit

## 限制

- 自研规则，不是完整的 ua-parser-js 库；冷门浏览器 / 爬虫会归为「未知」
- 版本号取 UA 中首个匹配到的字段
- 空输入返回空串

## 数据流向

**纯本地处理。** 正则匹配，不发送网络请求。`meta.api = false`。

## 示例

输入：

```text
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36
```

输出：

```text
浏览器：Chrome 126.0.0.0
操作系统：Windows 10/11
设备类型：桌面
渲染引擎：Blink
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #206                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P0                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

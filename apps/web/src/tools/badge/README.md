# Badge 生成

生成 [Shields.io](https://shields.io) 风格的状态徽章 URL，并给出 Markdown 与 HTML 两种嵌入代码。

## 用途

README 顶部那排「version 1.2.0 / license MIT / node >=18」小徽章，不用手拼 URL，
填三段文字即可。

## 输入

| 字段   | 类型   | 约束                        |
| ------ | ------ | --------------------------- |
| `text` | string | 最大 200,000 字符（触发用） |

## 选项

| 选项 key  | 界面 | 说明                                                             |
| --------- | ---- | ---------------------------------------------------------------- |
| `label`   | 标签 | 徽章左半段，如 `version`                                         |
| `message` | 信息 | 徽章右半段，如 `1.2.0`                                           |
| `color`   | 颜色 | 右边底色，如 `brightgreen` / `green` / `yellow` / `red` / `blue` |

## URL 规则

Shields 的静态徽章 URL 形态：

```
https://img.shields.io/badge/<label>-<message>-<color>
```

工具会把段内空格转成 `_`、连字符转义成 `--`，避免被误判为分隔符。

## 数据流向

**纯本地拼字符串。** 不实际请求 shields.io，徽章图片本身在你打开 README 时才由浏览器加载。
`meta.api = false`。

## 示例

标签 `version`、信息 `1.2.0`、颜色 `brightgreen`：

```text
# Badge URL
https://img.shields.io/badge/version-1.2.0-brightgreen

# Markdown
![version 1.2.0](https://img.shields.io/badge/version-1.2.0-brightgreen)

# HTML
<img src="https://img.shields.io/badge/version-1.2.0-brightgreen" alt="version 1.2.0" />
```

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #268                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |

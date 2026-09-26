# 跨语言正则

把一段 JavaScript 正则表达式转换成 **Python（re 模块）** 或 **Java（java.util.regex）** 的可用代码。

## 用途

同一份正则在 JS / Python / Java 里写法并不完全一致：字符串引号转义不同、
全局匹配的方式不同、标志名不同。本工具处理这些差异，直接给你可粘贴的代码片段。

## 输入

| 字段   | 类型   | 约束              | 说明                                      |
| ------ | ------ | ----------------- | ----------------------------------------- |
| `text` | string | 最大 200,000 字符 | JS 正则字面量 `/pattern/flags` 或纯模式串 |

## 输出

| 字段   | 类型   | 说明                       |
| ------ | ------ | -------------------------- |
| `text` | string | 目标语言的正则编译代码片段 |

## 选项

| 选项 key | 界面标签 | 取值              |
| -------- | -------- | ----------------- |
| `target` | 语言     | `python` / `java` |

## 标志差异对照

| JS 标志 | Python             | Java                       | 说明         |
| ------- | ------------------ | -------------------------- | ------------ |
| `g`     | 无（findall 默认） | 无（while(m.find()) 循环） | 全局匹配     |
| `i`     | `re.IGNORECASE`    | `Pattern.CASE_INSENSITIVE` | 忽略大小写   |
| `m`     | `re.MULTILINE`     | `Pattern.MULTILINE`        | 多行模式     |
| `s`     | `re.DOTALL`        | `Pattern.DOTALL`           | `.` 匹配换行 |
| `u`     | 默认开启           | 默认开启                   | Unicode 模式 |

## 实现规则

- 输入优先按 `/…/flags` 解析；否则整串当作纯模式串、flags 为空
- Python 用 raw string `r"…"` 承载模式（反斜杠不转义）；模式内含 `"` 时退回普通转义串
- Java 字符串里反斜杠必须双写：`\d` → `"\\d"`
- 输出代码带注释说明 `g` 标志在目标语言里如何处理

## 浏览器边界与限制

- 只做**语法/标志层面的文本转换**，不校验目标语言是否完全兼容 JS 正则特性
- 不处理前瞻后顾、命名分组、反向引用等高级特性的跨语言差异
- 空输入不产出；非法目标语言抛中文错误

## 数据流向

**纯本地处理。** 纯字符串转换，不发送任何网络请求。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```text
/#([A-Z])(\d+)/g
```

输出（`target=python`）：

```python
# Python 3（re 模块）
import re

pattern = re.compile(r"#([A-Z])(\d+)", 0)
# 注意：JS 的 g 标志在 Python 中不存在 —— re.findall / re.finditer 默认全局匹配
matches = pattern.findall(text)
```

输出（`target=java`）：

```java
// Java（java.util.regex）
import java.util.regex.*;

Pattern p = Pattern.compile("#([A-Z])(\\d+)", 0);
// 注意：JS 的 g 标志在 Java 中不存在 —— 用 while (m.find()) 循环即全局匹配
Matcher m = p.matcher(text);
while (m.find()) {
    // m.group() 整段；m.group(n) 第 n 个分组
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #194                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

# 版本号比较

按 [SemVer 2.0.0](https://semver.org/lang/zh-CN/) 规范比较两个版本号，含预发布号与 build metadata。
**不依赖 semver 包，纯 TS 自研解析与比较。**

## 用途

- 判断两个版本谁大谁小，尤其是带 `-beta.1` / `-rc.2` 这类预发布号时
- 看清两个版本各字段（major / minor / patch / prerelease / build）分别是什么

## 输入

分两行填写：

```text
1.2.3
1.2.4-beta.1
```

| 字段   | 类型   | 约束            |
| ------ | ------ | --------------- |
| `text` | string | 最大 2,000 字符 |

第一行是版本 A，第二行是版本 B。

## 比较规则

- 依次比 major → minor → patch
- 同 core 时，**有预发布号 < 无预发布号**（`1.0.0-alpha` < `1.0.0`）
- 预发布号按 `.` 分段逐段比：数字段按数值、字符串段按 ASCII；数字段 < 字符串段
- 同前缀下更长的预发布号更大（`alpha` < `alpha.1`）
- build metadata（`+build`）**不参与**比较

## 输出

一行 `A < B` 的关系、结论文字，以及两个版本的字段拆解。

## 数据流向

**纯本地处理。** 无网络请求。`meta.api = false`。

## 示例

输入：

```text
1.2.3
1.2.4-beta.1
```

输出：

```text
1.2.3 < 1.2.4-beta.1
结论：1.2.3 小于 1.2.4-beta.1

版本 A：1.2.3
  major=1 minor=2 patch=3
  prerelease=[] build=(无)
版本 B：1.2.4-beta.1
  major=1 minor=2 patch=4
  prerelease=[beta, 1] build=(无)
```

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #263                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS，自研 SemVer） |
| 模板     | T2（双栏）              |

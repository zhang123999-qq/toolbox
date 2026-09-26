# 动画生成

配置时长、缓动、次数、方向与关键帧，一键生成 `@keyframes` + `animation` CSS。

## 用途

不用记 `@keyframes` 语法和 `animation` 简写顺序，填几个值直接拿结果。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 输出

| 字段   | 类型   | 说明                                   |
| ------ | ------ | -------------------------------------- |
| `text` | string | `@keyframes` 块 + `animation` 简写规则 |

## 选项

| 选项 key    | 界面标签  | 说明                                             |
| ----------- | --------- | ------------------------------------------------ |
| `name`      | 动画名    | 字母开头，仅字母数字连字符                       |
| `duration`  | 时长      | 如 `1s` / `500ms`                                |
| `timing`    | 缓动      | ease / linear / ease-in / ease-out / ease-in-out |
| `delay`     | 延迟      | 如 `0s`                                          |
| `iteration` | 次数      | infinite / 1 / 2 / 3                             |
| `direction` | 方向      | normal / reverse / alternate / alternate-reverse |
| `from`      | from 样式 | 起始关键帧声明，如 `opacity: 0`                  |
| `to`        | to 样式   | 结束关键帧声明，如 `opacity: 1`                  |

## 限制

- 只生成 `from` / `to` 两帧，不支持 `50%` 中间帧
- 不自动加浏览器前缀（配合「CSS 前缀」工具使用）
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例

输出：

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fadeIn {
  animation: 1s ease 0s infinite normal fadeIn;
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #238                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

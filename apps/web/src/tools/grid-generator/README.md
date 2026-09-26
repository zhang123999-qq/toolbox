# Grid 生成

可视化配置 CSS Grid 布局，一键生成 `grid-template-columns` 等规则。

## 用途

用文本框写轨道模板（如 `1fr 1fr 1fr`），直接拿到可粘贴的 Grid CSS。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 输出

| 字段   | 类型   | 说明                         |
| ------ | ------ | ---------------------------- |
| `text` | string | 一段 `.container { … }` 规则 |

## 选项

| 选项 key       | 界面标签 | 说明                                      |
| -------------- | -------- | ----------------------------------------- |
| `columns`      | 列模板   | `grid-template-columns`，如 `1fr 1fr 1fr` |
| `rows`         | 行模板   | `grid-template-rows`，留空则不输出        |
| `gap`          | 间距     | 数字或带单位长度                          |
| `justifyItems` | 水平对齐 | stretch / start / center / end            |
| `alignItems`   | 垂直对齐 | stretch / start / center / end            |

## 限制

- 不生成 `grid-area` / 命名线 / 自动放置等高级特性
- 轨道模板仅做字符级校验
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例

输出：

```css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  justify-items: stretch;
  align-items: stretch;
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #234                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P0                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

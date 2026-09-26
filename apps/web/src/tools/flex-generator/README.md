# Flex 生成

可视化配置 Flexbox 布局参数，一键生成 `.container` 的 CSS。

## 用途

记不住 `justify-content` / `align-items` 的全部取值？在这里点选方向、对齐、换行与间距，
直接拿到可粘贴的 CSS。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用：留空不产出，点「示例」或随手输入即生成。

## 输出

| 字段   | 类型   | 说明                         |
| ------ | ------ | ---------------------------- |
| `text` | string | 一段 `.container { … }` 规则 |

## 选项

| 选项 key    | 界面标签   | 取值                                                                         |
| ----------- | ---------- | ---------------------------------------------------------------------------- |
| `direction` | 方向       | row / row-reverse / column / column-reverse                                  |
| `justify`   | 主轴对齐   | flex-start / center / flex-end / space-between / space-around / space-evenly |
| `align`     | 交叉轴对齐 | stretch / center / flex-start / flex-end / baseline                          |
| `wrap`      | 换行       | nowrap / wrap / wrap-reverse                                                 |
| `gap`       | 间距       | 数字或带单位长度（如 `12px`、`1rem`）                                        |

## 限制

- 只输出容器规则，不生成子项的 `flex` / `flex-grow` 等
- gap 仅做格式校验，非法值会报错
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 纯字符串拼接，不发送网络请求。`meta.api = false`。

## 示例

输出（默认值）：

```css
.container {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: stretch;
  flex-wrap: nowrap;
  gap: 12px;
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #233                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P0                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

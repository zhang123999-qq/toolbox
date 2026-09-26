# CSS 前缀

按静态 caniuse 规则表为 CSS 属性自动追加 `-webkit-` / `-moz-` / `-ms-` 浏览器前缀。

## 用途

替代 Autoprefixer 的轻量自研版：贴入现代写法的 CSS，输出兼容老内核的带前缀版本。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

## 输出

| 字段   | 类型   | 说明           |
| ------ | ------ | -------------- |
| `text` | string | 加了前缀的 CSS |

## 规则表（静态）

| 标准属性                           | 追加前缀                                        |
| ---------------------------------- | ----------------------------------------------- |
| `display: flex`                    | `display: -webkit-box;` `display: -ms-flexbox;` |
| `transform`                        | `-webkit-` `-ms-`                               |
| `transition`                       | `-webkit-`                                      |
| `animation*`                       | `-webkit-`                                      |
| `user-select`                      | `-webkit-` `-moz-` `-ms-`                       |
| `backdrop-filter`                  | `-webkit-`                                      |
| `backface-visibility`              | `-webkit-`                                      |
| `appearance`                       | `-webkit-` `-moz-`                              |
| `column-*`                         | `-webkit-` `-moz-`                              |
| `tab-size`                         | `-moz-`                                         |
| `flex` / 对齐                      | `-webkit-box-*` `-ms-flex-*`                    |
| `background: linear-gradient(...)` | 同时输出 `-webkit-linear-gradient(...)` 版本    |

## 限制

- 是静态规则表，不按浏览器版本矩阵裁剪，会偏保守（多给前缀）
- `@media` / `@keyframes` 块整体透传，不深入处理内部规则
- 不做删除已有冗余前缀的反向清理
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** `meta.api = false`。

## 示例

输入：

```css
.box {
  display: flex;
  transform: translateX(10px);
}
```

输出：

```css
.box {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-transform: translateX(10px);
  -ms-transform: translateX(10px);
  transform: translateX(10px);
}
```

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #232                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P1                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

# JSON 转 Rust

由 JSON 样本生成 Rust `struct`，可选 `serde` 派生与字段命名策略。

## 用途

对接 Rust 后端（actix / axum / reqwest 等）时，贴一份真实 JSON 即可得到可直接配合
`serde_json` 使用的结构体；嵌套对象自动拆成独立 `struct`，被引用者先声明。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 2,000,000 字符 |

根节点必须是对象，或元素全为对象的非空数组。

## 输出

| 字段   | 类型   | 说明                        |
| ------ | ------ | --------------------------- |
| `text` | string | Rust struct；空输入返回空串 |

## 选项

| 选项     | 取值          | 默认    | 说明                                                                  |
| -------- | ------------- | ------- | --------------------------------------------------------------------- |
| `mode`   | serde / plain | `serde` | serde 模式加 `Serialize/Deserialize` 派生；plain 只留 Debug/Clone     |
| `style`  | snake / keep  | `snake` | snake 转 snake_case 字段并配 `rename_all`；keep 保留原键逐字段 rename |
| `indent` | 2 / 4 / tab   | `2`     | 一级缩进                                                              |

## 类型映射

| JSON            | Rust（非空）        | Rust（可能为 null / 缺失） |
| --------------- | ------------------- | -------------------------- |
| string          | `String`            | `String`                   |
| true / false    | `bool`              | `Option<bool>`             |
| 整数            | `i64`               | `Option<i64>`              |
| 浮点            | `f64`               | `Option<f64>`              |
| null / 无法推断 | `serde_json::Value` | `serde_json::Value`        |
| 数组            | `Vec<T>`            | `Vec<T>`                   |
| 对象            | 独立 `struct`       | 独立 `struct`              |

## 限制

- 全部逻辑为纯 TS 自研，不依赖 npm 代码生成库，行为以本文档为准
- 类型由样本推断：样本未出现的字段无法预知；数组多条样本合并后，缺失键标记为 `Option<T>`
- `String` 本身可承载空值，可空字符串不再包 `Option`；嵌套对象可空时也不额外包 `Option`
- snake 模式假设源 JSON 为 camelCase（通过 `rename_all = "camelCase"` 还原）；
  kebab 等其它命名请用 keep 模式（逐字段 `serde(rename)`）
- 字段名是 Rust 关键字时加 `r#` 前缀；无 ASCII 字母时回退 `field_n`
- 输入上限 2,000,000 字符，超限抛 `JsonToRustError`

## 数据流向

**纯本地处理。** 输入仅在浏览器内存中处理，不发送网络请求，不写入服务端。`meta.api = false`。

## 示例

输入：

```json
{ "userId": 1, "userName": "工具库" }
```

输出（serde + snake）：

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Root {
  pub user_id: i64,
  pub user_name: String,
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #144                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

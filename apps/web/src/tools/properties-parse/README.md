# Properties 解析

Java Properties 与 JSON 双向互转，还原 `\uXXXX` 转义。

## 用途

读 / 写 Spring、Maven、各类 Java 工程的 `.properties` 文件：转 JSON 便于搜索与批量修改，
改完再转回 Properties。`\uXXXX` 会还原成真实字符，不用再对着编码表猜。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 1,000,000 字符 |

## 输出

| 字段   | 类型   | 说明                                       |
| ------ | ------ | ------------------------------------------ |
| `text` | string | 转换后的 JSON / Properties；空输入返回空串 |

## 选项

| 选项        | 取值                        | 默认         | 说明                                   |
| ----------- | --------------------------- | ------------ | -------------------------------------- |
| `direction` | `props2json` / `json2props` | `props2json` | 转换方向                               |
| `encoding`  | `unicode` / `escaped`       | `unicode`    | 输出时非 ASCII 原样，还是写成 `\uXXXX` |
| `indent`    | `2` / `4`                   | `2`          | JSON 侧缩进档位                        |

## 支持范围

- 三种分隔符：`=`、`:`、空白（分隔符前后的空白都会跳过）
- 注释：整行 `#` 与 `!`（可带前导空白）
- 转义还原：`\n` `\t` `\r` `\f` `\\` `\uXXXX`，以及 `\:` `\=` 等「反斜杠 + 任意字符 → 该字符」
- 行尾单个反斜杠续行；续行开头的空白按 Java 语义丢弃
- 键与值都做转义还原，值**一律为字符串**（与 `java.util.Properties` 一致）
- 输出时自动转义键中的 `=` `:` `\` 与空白

## 限制

- **注释会丢失**：JSON 没有注释语法，Properties → JSON 时注释被丢弃
- **值不区分类型**：`8080`、`false` 读进来都是字符串，与 Java 一致
- **不处理 ISO-8859-1 字节流**：Java 按 Latin-1 读文件，本工具按 UTF-8 文本处理；
  非 UTF-8 编码的历史文件请先转成 UTF-8，或改用 `\uXXXX` 转义写法
- **不支持 `\U` 八位转义**（Java 也没有）、不支持 XML 格式的 `.properties`
- JSON → Properties 时：**顶层必须是对象**；`null`、数组、对象作为值都会报错
- JSON → Properties 时：不输出注释头与时间戳，输出顺序与 JSON 键顺序一致
- 数字超 `Number.MAX_SAFE_INTEGER` 时按双精度处理，可能丢失末位精度

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（Properties）：

```properties
app.name = 工具库
app.port = 8080
app.debug = false
legacy.title = \u5de5\u5177\u5e93
```

输出（JSON，`indent = 2`）：

```json
{
  "app.name": "工具库",
  "app.port": "8080",
  "app.debug": "false",
  "legacy.title": "工具库"
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #157                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P2                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

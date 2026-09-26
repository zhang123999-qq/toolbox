# Protobuf 编解码

解析 `.proto` 定义里的 message / enum 结构（字段类型、字段号、wire type），并对**手动输入的字段值**做编码演示，或对**手动输入的字节串**做解码演示。

> **不是完整的 protobuf 运行时。** 本工具只做结构解析与编码演示，不能替代 `protobufjs` / `protoc`。

## 用途

- 看一份 `.proto` 的字段骨架与每个字段的 wire type
- 学习 varint / zigzag：输入 `score = -3`、`id = 1`，看它到底打成哪几个字节
- 拿到一段 protobuf 字节流，按定义还原出字段值

## 输入

| 字段     | 类型   | 约束                                                                                   |
| -------- | ------ | -------------------------------------------------------------------------------------- |
| `text`   | string | `.proto` 定义文本，最大 200,000 字符                                                   |
| `values` | string | 编码模式下是字段值的 JSON 对象；解码模式下是字节串（hex 或 base64）；最大 200,000 字符 |

## 输出

| 字段   | 类型   | 说明                                           |
| ------ | ------ | ---------------------------------------------- |
| `text` | string | 结构预览 / 编码明细 / 解码明细；空输入返回空串 |

## 选项

| 选项     | 取值                              | 默认        | 说明                                                      |
| -------- | --------------------------------- | ----------- | --------------------------------------------------------- |
| `mode`   | `structure` / `encode` / `decode` | `structure` | 结构预览、编码演示、解码演示                              |
| `target` | string                            | 空          | 目标 message 名（可写短名）；留空取第一个有字段的 message |
| `format` | `hex` / `base64`                  | `hex`       | 输出字节串的表示形式                                      |

## 限制

- **原规划可行性为 B（protobufjs / wasm）**，受「不新增依赖、不引入 wasm」约束，降级为纯 JS 实现，`meta.feasibility` 记为 `A`
- **不是完整的 protobuf 运行时**：不做 proto2 默认值、不做 group（wire type 3/4）、不处理 well-known types（`google.protobuf.Timestamp` 等按普通 message 处理）
- **repeated 字段按非 packed 逐项编码**（每项各带 tag）；proto3 默认的 packed 编码暂不支持
- `service` / `extend` / `option` / `reserved` / `extensions` 直接跳过；`oneof` 展开为普通字段，不校验互斥语义
- 文件内未定义的自定义类型按嵌套消息处理，并在输出头部给出告警
- 未知字段解码时会按 wire type 跳过，并在明细里标为「(未知字段)」
- 输入上限 200,000 字符，非法 `.proto` / 非法字段值抛出 `ProtobufCodecError`（中文提示）

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

`.proto`：

```proto
syntax = "proto3";

message User {
  int32 id = 1;
  string name = 2;
  sint32 score = 3;
}
```

字段值（编码模式）：

```json
{ "id": 1, "name": "abc", "score": -3 }
```

输出（节选）：

```
# 编码演示（message User）
字段明细（tag + 值）：
  1 id (int32) = 1
       08 01
  2 name (string) = "abc"
       12 03 61 62 63
  3 score (sint32) = -3
       18 05

hex:    080112036162631805
字节数: 8
```

`score = -3` 走 zigzag：`(-3 << 1) ^ -1 = 5`，所以在线上只占 1 字节 `05`。

## 元信息

| 项       | 值                            |
| -------- | ----------------------------- |
| 全局编号 | #173                          |
| 域       | `data-format`（数据格式）     |
| 大组     | `dev`                         |
| 优先级   | P2                            |
| 可行性   | A（纯 JS 降级实现，原规划 B） |
| 模板     | T2（双栏）                    |

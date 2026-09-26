# Parquet 查看

上传一个 `.parquet` 文件，离线读取它的**页脚元数据**：Parquet 版本、总行数、row group 数量、
叶子列数、生成工具（`created_by`）、自定义键值，以及完整的字段 schema 树（物理类型 / 嵌套 /
repetition / 逻辑类型）。纯本地解析，不把文件上传到任何服务器。

> **与规划文档的偏差说明（重要）**：规划表（03-数据格式.md #177）为 B 级、设想用 `parquet-wasm`
> 在浏览器里读取列数据。该 wasm 依赖**未安装**，本仓库约束零新增网络依赖；而 Parquet 的列式数据
> 还涉及 Snappy / Zstd / Gzip 解压与多种编码（RLE / 字典 / Delta），用纯 TS 完整实现不现实。
> 因此本工具**只解析尾部页脚的 Thrift Compact 元数据，不读取 / 解压任何列数据值**。
> 要看数据内容，请用 DuckDB、`parquet-tools`、pandas / pyarrow 等。

## 用途

拿到一个 Parquet 文件先做无依赖的快速摸底：多少行、分了几个 row group、有哪些列、什么物理 / 逻辑类型、
嵌套结构如何、是哪个引擎写出的。无需安装任何大数据组件。

## 输入

| 入口     | 说明                                    |
| -------- | --------------------------------------- |
| 文件上传 | `.parquet`，上限 30 MiB（只读尾部页脚） |

文本框不承载二进制内容；若在文本框运行会提示改用文件上传。

## 输出

Markdown 报告：

```
# Parquet 元数据
Parquet 版本：1
总行数：2
Row group 数：1
叶子列数：2
生成工具：demo-writer 1.0

## Schema
- root：
  - id：required INT32
  - name：optional BYTE_ARRAY → UTF8
```

## 实现要点

- 校验首尾 magic `PAR1`，从尾部 4 字节读 footer 长度
- 手写 **Thrift Compact Protocol** 解码器（varint / zigzag、struct / list / map、二进制与 double）
- 按 `parquet.thrift` 解释 `FileMetaData`；schema 是 preorder 扁平数组（父节点带 `num_children`），重建为树
- 物理类型（BOOLEAN/INT32/INT64/FLOAT/DOUBLE/BYTE_ARRAY/…）与常见 converted type（UTF8/DATE/
  TIMESTAMP_*/DECIMAL/JSON/…）映射为可读名

## 限制

- **不读取列数据值、不解压**：不支持 Snappy/Zstd/Gzip、字典 / RLE / Delta 解码，不输出数据样例
- 只展示页脚概览，不展开每个 row group 的列块偏移 / 统计信息（min/max/null count）
- 加密 Parquet（encryption footer）无法解析；超过 30 MiB 的文件直接拒绝
- 文件头 / 尾 magic 不符、页脚长度非法、Thrift 结构损坏时抛 `ParquetViewError`

## 数据流向

**纯本地处理。** 文件只在浏览器内存中读取尾部页脚，不上传、不写服务端。`meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #177                             |
| 域       | `data-format`（数据格式）        |
| 大组     | `dev`                            |
| 优先级   | P3                               |
| 可行性   | A（元数据；wasm 数据读取已裁剪） |
| 模板     | T2（双栏 + 文件上传）            |

# Excel 转 CSV

把表格文件转成 CSV：文本表格（`.csv` / `.tsv` / `.txt`）直接解析；`.xlsx` 用一个**最小 zip + XML 解析**读取第一张工作表。

## ⚠️ 关于 .xlsx：不装 xlsx 库，改用原生 DecompressionStream

规划表里本工具的依赖是 `xlsx`（SheetJS），但本项目**禁止新增 npm 依赖**。
所以这里没有用库，而是自己实现了最小链路：

1. `File.arrayBuffer()` → 按 **ZIP 中央目录**找到条目（不校验 CRC、不支持 zip64 / 分卷）
2. 条目用浏览器原生 `DecompressionStream('deflate-raw')` 解压（method 8）；
   未压缩条目（method 0）直接读取；其它压缩方式明确报错
3. 只取两个部件：`xl/sharedStrings.xml`（共享字符串）与 `xl/worksheets/sheet1.xml`（第一张表）
4. 按单元格的 `t` 属性还原类型：`s` 查共享字符串、`inlineStr` 取内联文本、`b` 转 `TRUE`/`FALSE`，其余按数字

**限制**：只支持 **deflate 或未压缩**的 `.xlsx`；只取**第一张工作表**；不还原公式、样式、日期格式、
合并单元格、批注。真正的 `.xls`（BIFF 二进制）、`.xlsm`、加密文件都不支持，会给出中文报错。

如果不想碰这些限制，把 Excel 里的内容**另存为 CSV / TSV** 再上传即可——文本表格路径是完整支持的。

## 用途

把同事发来的 xlsx 报表快速转成 CSV 喂给脚本 / 数据库导入，不必为了转格式装 Office 或 Python。

## 输入

| 字段   | 类型   | 约束                                            |
| ------ | ------ | ----------------------------------------------- |
| `text` | string | 最大 5,000,000 字符（文本模式）                 |
| `file` | File   | `.xlsx` / `.csv` / `.tsv` / `.txt`，最大 20 MiB |

## 输出

| 字段   | 类型   | 说明                            |
| ------ | ------ | ------------------------------- |
| `text` | string | CSV 或 TSV 文本；空输入返回空串 |

## 选项

| 选项        | 取值                                            | 默认   | 说明                                      |
| ----------- | ----------------------------------------------- | ------ | ----------------------------------------- |
| `delimiter` | `auto` / `comma` / `tab` / `semicolon` / `pipe` | `auto` | **源**文本表格的分隔符，`auto` 按首行猜测 |
| `format`    | `csv` / `tsv`                                   | `csv`  | **输出**格式                              |

## 转换规则

1. 行宽不等时补空串，保证输出的 CSV 列数一致
2. 空行跳过（papaparse `skipEmptyLines: greedy`），CRLF 统一成 LF
3. 输出交给 papaparse 序列化，需要引号时自动加引号
4. `.xlsx` 路径不读 `delimiter`（xlsx 没有分隔符概念）

## 限制

- **不装 xlsx 库**，能力边界见开头
- 文本输入上限 5,000,000 字符、文件上限 20 MiB，超出抛 `ExcelToCsvError`
- 引号不配对的文本表格无法解析，直接抛错
- 若运行环境没有 `DecompressionStream`（较老的浏览器），选 `.xlsx` 会明确提示改用文本表格

## 数据流向

**纯本地处理。** 文件内容只在浏览器内存中解析，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（TSV 文本或上传的表格）：

```tsv
name	tools	local
工具库	870	true
```

输出（`format=csv`）：

```csv
name,tools,local
工具库,870,true
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #163                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS + papaparse）    |
| 模板     | T2（双栏）                |

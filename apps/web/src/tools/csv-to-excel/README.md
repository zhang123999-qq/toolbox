# CSV 转 Excel

把 CSV 转成 **Excel 可直接打开的 SpreadsheetML 2003 表格（`.xml`）**，也可原样输出 CSV / TSV。

## ⚠️ 重要：输出的是 `.xml`（SpreadsheetML 2003），不是 `.xlsx`

规划表里本工具的依赖是 `xlsx`（SheetJS），但本项目**禁止新增 npm 依赖**，
而 `.xlsx` 本质是 zip 包 + OOXML 部件，不借助专门的库就无法在纯前端生成。
因此降级为 **SpreadsheetML 2003**（Excel XML Spreadsheet）：

- 它是纯文本 XML，Excel 2003 起原生支持，双击即可打开
- 打开时 Excel 可能提示「文件格式与扩展名不匹配」，点「是」继续即可
- 需要在 Excel 里保存成 `.xlsx` 时，用「文件 → 另存为 → Excel 工作簿」即可

另外，模板的「下载」按钮固定把文件存成 `<slug>.json`，请下载后手动改成 `.xml`；
或直接用「复制」把内容粘进文本编辑器另存为 `xxx.xml`。

## 用途

把导出的 CSV 变成能直接在 Excel 里编辑、带表头加粗样式的表格，省掉「数据 → 导入文本」那几步。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 5,000,000 字符 |

## 输出

| 字段   | 类型   | 说明                                           |
| ------ | ------ | ---------------------------------------------- |
| `text` | string | SpreadsheetML 文本 / CSV / TSV；空输入返回空串 |

## 选项

| 选项        | 取值                                   | 默认    | 说明                                      |
| ----------- | -------------------------------------- | ------- | ----------------------------------------- |
| `format`    | `xml` / `csv` / `tsv`                  | `xml`   | 输出格式                                  |
| `header`    | boolean                                | `true`  | 首行为表头（xml 模式下首行加粗 + 浅灰底） |
| `delimiter` | `comma` / `tab` / `semicolon` / `pipe` | `comma` | 源文本的分隔符                            |

## 转换规则

1. 纯数字单元格写 `ss:Type="Number"`，其余一律 `String`（避免 Excel 把 `007` 这类串吞掉）
2. 空单元格只写 `<Cell/>`，Excel 显示为空格
3. `&`、`<`、`>`、`"` 全部按 XML 规则转义
4. `csv` / `tsv` 模式交给 papaparse 重新序列化，顺带统一引号与换行（LF）

## 限制

- **不产出 `.xlsx`**，原因见开头
- 只生成一张工作表 `Sheet1`，不支持多表、公式、合并单元格、列宽设置
- 只有两个内置样式（默认 / 表头），不支持自定义字体与数字格式
- 输入上限 5,000,000 字符，超出抛出 `CsvToExcelError`
- 引号不配对的行无法解析，直接抛错

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```csv
name,tools,local
工具库,870,true
```

输出（`format=xml`、`header=true`，节选）：

```xml
<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" …
  <Table>
    <Row><Cell ss:StyleID="sHeader"><Data ss:Type="String">name</Data></Cell>…
    <Row><Cell><Data ss:Type="String">工具库</Data></Cell><Cell><Data ss:Type="Number">870</Data></Cell>…
  </Table>
</Workbook>
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #162                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS + papaparse）    |
| 模板     | T2（双栏）                |

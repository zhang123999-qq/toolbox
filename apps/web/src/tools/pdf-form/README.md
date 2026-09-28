# PDF 表单 pdf-form（#492）

## 用途 | Purpose

- 读取 PDF 表单（AcroForm）字段，按类型渲染编辑器并填写，导出新 PDF。
- Fill PDF (AcroForm) form fields with per-type editors and export a new PDF.
- 支持的字段类型 | Supported field types:
  - 文本框 Text field（`setText`，尊重 `maxLength`，超长截断并提示；多行文本用 textarea）
  - 复选框 Checkbox（`check`/`uncheck`）
  - 单选组 Radio group（`select`/`clear`）
  - 下拉框 Dropdown（`getOptions`/`select`，支持多选；无选项时给明确提示不崩溃）
  - 其他（如按钮 PDFButton）标记为“不支持填写”，不崩溃

## 输入 | Input

- PDF 文件：单文件上限 50MB，校验 `%PDF` 魔数。
- PDF file: max 50MB per file, `%PDF` magic number checked.
- 加密的 PDF 明确报错（pdf-lib 1.17.1 不支持解密）；损坏的 PDF 明确报错。
- Encrypted PDFs are rejected with a clear message (pdf-lib 1.17.1 cannot decrypt); corrupted PDFs are rejected too.

## 选项 | Options

| 选项         | 说明                                 | Option  | Description                                  |
| ------------ | ------------------------------------ | ------- | -------------------------------------------- |
| 拼合 flatten | 导出时将字段转为静态内容，不可再编辑 | Flatten | Flatten fields into static content on export |

## 输出 | Output

- 填写后的新 PDF，文件名为原名 + `-filled.pdf`，一键下载。
- The filled PDF, named `<original>-filled.pdf`, one-click download.

## 边界 | Limits

- 无表单字段的 PDF 显示明确空状态（“不包含可填写的表单字段”），不报错不崩溃。
- 字段无名称时用“未命名字段 #序号”兜底显示；只读字段禁用编辑并打标。
- 下拉框无选项时不渲染 select，给明确提示（避免 pdf-lib `select` 抛错）。
- 文本框 `maxLength`：输入超长时截断并显示提示（pdf-lib 的 `setText` 超长会直接抛错，故先截断）。
- 不调用 `updateFieldAppearances`：pdf-lib 内置标准字体无法编码 CJK，调用会抛错；字段值在数据层面正确写入并可被读取，多数阅读器可正常显示。
- 全程本地 pdf-lib 处理，不上传。

## 数据流向 | Data flow

文件 → 内存 PDFDocument（getForm 枚举字段）→ 填写 → save → Blob → 下载；不经过网络。

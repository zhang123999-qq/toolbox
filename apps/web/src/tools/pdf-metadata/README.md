# PDF 元数据 pdf-metadata（#499）

## 用途 | Purpose

- 本地查看 PDF 文档元数据：标题 / 作者 / 主题 / 关键字 / 创建者 / 生产者 / 创建时间 / 修改时间 / 页数。
- View PDF document metadata locally: title / author / subject / keywords / creator / producer / creation & modification dates / page count.
- 支持编辑标题、作者、主题、关键字，一键清空可编辑字段，重新保存下载新 PDF。
- Supports editing title, author, subject, keywords; one-click clear of editable fields; re-save and download a new PDF.

## 输入 | Input

- PDF 文件：按 `%PDF` 魔数校验（不依赖扩展名），单文件上限 50MB；加密 PDF 会明确提示先解密。
- PDF file: validated by `%PDF` magic bytes (not extension), max 50MB per file; encrypted PDFs get a clear "decrypt first" hint.

## 选项 | Options

| 选项            | 说明                                | Option   | Description                       |
| --------------- | ----------------------------------- | -------- | --------------------------------- |
| 标题 title      | 文本，可清空                        | Title    | Text, clearable                   |
| 作者 author     | 文本，可清空                        | Author   | Text, clearable                   |
| 主题 subject    | 文本，可清空                        | Subject  | Text, clearable                   |
| 关键字 keywords | 逗号分隔多值，连续逗号/首尾空格安全 | Keywords | Comma-separated; tolerant of ",," |

- 创建者 / 生产者 / 创建时间 / 修改时间 / 页数只读展示，不提供编辑。
- Creator / producer / dates / page count are read-only.

## 输出 | Output

- 元数据一览、编辑表单，保存后生成新 PDF 并可一键下载（文件名 `原名-metadata.pdf`）。
- Metadata overview plus edit form; saving produces a new PDF for one-click download (`<name>-metadata.pdf`).

## 边界 | Limits

- 全程本地 pdf-lib 处理，不上传。
- 读取与保存时均传 `updateMetadata: false`，且 `save()` 本身不写元数据：未改字段原样保留，「清空」后 Producer/Creator 不会出现 pdf-lib 字样。
- 保存时 `addDefaultPage: false`：0 页 PDF 不会凭空多出一页白纸。
- 日期字段只读：个别 PDF 的非法日期字符串会被视为缺失展示，不会导致整个工具报错。
- pdf-lib 写 Keywords 时按空格拼接（PDF 规范如此），这是文件格式层面的如实呈现。
- 加密 PDF 无法处理（pdf-lib 限制），页面会明确提示。

## 数据流向 | Data flow

文件 → 内存 pdf-lib Document → 新字节 → Blob → 下载；不经过网络。

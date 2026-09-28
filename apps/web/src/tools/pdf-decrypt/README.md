# PDF 解密 pdf-decrypt（#490）

## 用途 | Purpose

- 上传已加密的 PDF，输入打开密码，本地解密为无密码的干净 PDF（保留原内容与页数），一键下载。
- Upload an encrypted PDF, enter its open password, and decrypt locally into a clean password-free PDF (content and pages preserved), ready to download.
- qpdf `--decrypt` 为**无损结构解密**（移除加密字典并解密对象流），不是转图片再重建，文本/矢量/字体原样保留。

## 输入 | Input

- 已加密的 PDF 文件（.pdf），单文件上限 50MB。
- Encrypted PDF file (.pdf), max 50MB per file.
- PDF 打开密码（用户密码 / user password）。

## 输出 | Output

- 无密码的干净 PDF，文件名后缀 `-decrypted.pdf`，附页数统计，一键下载。
- Clean password-free PDF named `<原名>-decrypted.pdf`, with page count, one-click download.

## 边界 | Limits

- 未加密的 PDF：直接提示"该 PDF 未加密，无需解密"，不走解密流程。
- 密码错误：明确报错"密码错误，请检查后重试"（qpdf 退出码 2），不泄露其他信息。
- 损坏的 PDF：报错"解密失败，文件可能已损坏"。
- 解密输出会经 pdf-lib 二次校验（`PDFDocument.load(out, { updateMetadata: false })`），确认是合法 PDF 才交付；`updateMetadata:false` 避免 pdf-lib 在载入时改写 Producer。
- qpdf 12 默认拒绝**写入**弱加密（RC4 等），但读取/解密弱加密文件不受影响（已实测 RC4-128 解密成功，无需 `--allow-weak-crypto`）。

## 技术 | Tech

- 可行性 B（wasm）：pdf-lib 1.17.1 的 `load` 不支持 password 参数，加密文件直接抛 `EncryptedPDFError`，**无法解密**；改用 `@neslinesli93/qpdf-wasm`（qpdf 12.2.0 编译为 WASM，ISC），共享封装见 `apps/web/src/lib/qpdf.ts`（`runQpdf`：按退出码判失败，虚拟 FS 路径唯一化 + finally 清理）。
- 解密参数：`['--password=<密码>', '--decrypt', '--', 输入路径, 输出路径]`（纯函数 `buildDecryptArgs` 构造，可单测）。
- 运行在主线程（qpdf 为同步 `callMain` 调用，常规文件 <1s），有 processing 状态提示"正在加载解密引擎…"。

## 密码安全 | Password safety

- 全程本地处理，不上传；密码只保存在内存 state，解密完成立即清空输入框。
- 密码只拼进当次 qpdf 调用参数，绝不进入错误消息、日志或任何持久化存储。
- 错误分类（`classifyDecryptError`）只看退出码：退出码 2 → 密码错误，其余 → 解密失败。

## 数据流向 | Data flow

文件 → 内存 → qpdf-wasm 解密 → pdf-lib 校验 → Blob → 下载；不经过网络。

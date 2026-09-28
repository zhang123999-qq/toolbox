/** 单文件上限：50 MiB。docx 是 zip 包，50 MiB 已覆盖绝大多数文档 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

/** 字节数转人类可读：1536 → "1.50 KiB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

/** 校验上传的文件：扩展名 / 空文件 / 体积；不合法抛中文错误 */
export function assertDocxFile(file: { readonly name: string; readonly size: number }): void {
  if (!/\.docx$/i.test(file.name)) {
    throw new Error(`请选择 .docx 文件（当前文件：${file.name === '' ? '未知' : file.name}）`)
  }
  if (file.size === 0) throw new Error('文件为空，请选择有效的 .docx 文件')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
}

/** 切出精确的 ArrayBuffer：subarray 的结果 byteOffset 未必为 0 */
export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** 去掉 <img …> 标签：imageMode=ignore 时文档图片不进入输出 */
export function stripImageTags(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, '')
}

/** 转换结果非空校验：去图片后正文为空时抛中文错误 */
export function assertNonEmptyHtml(html: string): void {
  if (html.trim() === '') throw new Error('文档中没有可转换的内容')
}

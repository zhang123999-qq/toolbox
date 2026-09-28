/**
 * image-to-base64 纯函数：DataURL 解析、输出形式选择、文件名构造、输入校验。
 * 不触碰 DOM/Canvas/剪贴板，可 100% 单测。
 * 文件读取（FileReader）由 Tool.tsx 调用 lib 的 readFileAsDataURL 完成。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 批量总数上限 20（Base64 体积膨胀约 37%，控制内存占用） */
export const MAX_FILE_COUNT = 20

/** 输出形式：dataUrl=含 data:image/...;base64, 前缀；raw=纯 Base64 无前缀 */
export type OutputKind = 'dataUrl' | 'raw'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验批量文件数量 */
export function assertFileCountOk(count: number): void {
  if (count > MAX_FILE_COUNT) {
    throw new Error(`一次最多选择 ${MAX_FILE_COUNT} 个文件`)
  }
}

/**
 * 剥离 DataURL 前缀，返回 {mime, base64}。
 * FileReader.readAsDataURL 产物形如 data:image/png;base64,iVBOR…。
 */
export function stripDataUrlPrefix(dataUrl: string): { mime: string; base64: string } {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl)
  if (!m) throw new Error('DataURL 格式无效')
  // 上面三个分组在正则匹配成功时必定参与（可能为空串），无需空合并
  return { mime: m[1], base64: m[3] }
}

/** DataURL → 纯 Base64（去掉 data:image/...;base64, 前缀） */
export function toRawBase64(dataUrl: string): string {
  return stripDataUrlPrefix(dataUrl).base64
}

/** 按输出形式取最终文本：dataUrl 原样返回，raw 去前缀 */
export function selectOutput(dataUrl: string, kind: OutputKind): string {
  return kind === 'dataUrl' ? dataUrl : toRawBase64(dataUrl)
}

/** 构造单项 txt 文件名：原名换扩展名为 .txt */
export function buildTxtFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}.txt`
}

/** 构造合并下载文件名：base64-<数量>-images.txt */
export function buildCombinedFileName(count: number): string {
  return `base64-${count}-images.txt`
}

/**
 * 构造合并下载文本：每项以 `// 文件名` 开头，项之间空一行。
 * 供「全部下载」一次性写入单个 txt。
 */
export function buildCombinedText(items: Array<{ fileName: string; text: string }>): string {
  return items.map((item) => `// ${item.fileName}\n${item.text}`).join('\n\n')
}

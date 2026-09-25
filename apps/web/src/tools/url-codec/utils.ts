import type { UrlCodecInput, UrlCodecOptions } from './schema'

/**
 * 编码。
 * component 用 encodeURIComponent —— query 参数值、路径片段用它，
 *   `/ ? & = # +` 等一律转义，避免把值里的 & 当成参数分隔符。
 * uri 用 encodeURI —— 整条 URL 用它，保留 `:/?#[]@` 等结构字符。
 * 两者都不会转义 `!'()*`，此处按更严格的 RFC 3986 一并补上（与 OWASP 建议一致）。
 */
export function encodeUrl(text: string, mode: string): string {
  const encoded = mode === 'uri' ? encodeURI(text) : encodeURIComponent(text)
  return encoded.replace(/[!'()*]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase())
}

/**
 * 解码。decodeURIComponent 会因为 % 后不是合法十六进制而抛 URIError，
 * 这里统一换成可读错误，并把常见的手写错误（如把空格写成 `+`）按表单语义还原。
 */
export function decodeUrl(text: string, mode: string): string {
  const normalized = text.replace(/\+/g, ' ')
  try {
    return mode === 'uri' ? decodeURI(normalized) : decodeURIComponent(normalized)
  } catch {
    // 包装在函数内部：本函数本身就是对外 API，直接调用时也应是可读错误
    throw new Error('解码失败：输入含不合法的百分号转义（% 后应跟两位十六进制），或存在残缺字节')
  }
}

export function transform(input: UrlCodecInput, options: UrlCodecOptions): string {
  if (input.text === '') return ''
  try {
    if (options.direction === 'decode') return decodeUrl(input.text, options.mode)
    return encodeUrl(input.text, options.mode)
  } catch {
    throw new Error('解码失败：输入含不合法的百分号转义（% 后应跟两位十六进制），或存在残缺字节')
  }
}

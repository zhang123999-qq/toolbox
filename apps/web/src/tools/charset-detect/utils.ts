import { analyse, detect } from 'chardet'
import type { CharsetDetectInput, CharsetDetectOptions } from './schema'

/**
 * 把文本按 Latin-1 还原成字节。
 * 乱码场景（UTF-8 / GBK 字节被当成 Latin-1 读出来）里字符都落在 0x00–0xFF，可以还原；
 * 一旦出现更大的码位就说明原始字节已丢失，返回 null。
 */
export function toBytes(text: string): Uint8Array | null {
  const bytes: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code > 0xff) return null
    bytes.push(code)
  }
  return Uint8Array.from(bytes)
}

/** 纯 7 位字节直接判 ASCII：chardet 对短 ASCII 样本会给出奇怪的高分候选 */
export function isAscii(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte >= 0x80) return false
  }
  return true
}

/** 码位转 U+XXXX */
export function hexOf(code: number): string {
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0')
}

/** 按给定编码解码；浏览器 / Node 未实现的编码（如 UTF-32）返回 null */
export function tryDecode(bytes: Uint8Array, encoding: string): string | null {
  try {
    return new TextDecoder(encoding.toLowerCase()).decode(bytes)
  } catch {
    return null
  }
}

/** 检测文本编码，并可选给出「按该编码重新解码」的预览（即乱码恢复） */
export function transform(input: CharsetDetectInput, options: CharsetDetectOptions): string {
  const bytes = toBytes(input.text)
  if (!bytes || bytes.length === 0) {
    return input.text === ''
      ? ''
      : '无法还原原始字节：文本里含有码位大于 U+00FF 的字符，请确认这是按单字节编码误读出来的乱码。'
  }
  if (isAscii(bytes)) return '检测结果：ASCII（纯 7 位字符，同时也是合法的 UTF-8）'

  const topN = Number(options.topN)
  const candidates = analyse(bytes).slice(0, topN)
  const best = detect(bytes) ?? '未知'
  const bestConfidence = candidates.find((item) => item.name === best)?.confidence ?? 0

  const out: string[] = [
    '检测结果：' + best + '（置信度 ' + bestConfidence + '）',
    '字节数：' + bytes.length,
    '候选：',
  ]
  candidates.forEach((item, index) => {
    out.push('  ' + (index + 1) + '. ' + item.name + '  ' + item.confidence)
  })

  if (options.preview) {
    const decoded = tryDecode(bytes, best)
    out.push('')
    if (decoded === null) {
      out.push('按 ' + best + ' 解码：该编码当前环境不支持（TextDecoder 未实现），无法预览。')
    } else {
      out.push('按 ' + best + ' 解码：')
      out.push(decoded)
    }
  }
  return out.join('\n')
}

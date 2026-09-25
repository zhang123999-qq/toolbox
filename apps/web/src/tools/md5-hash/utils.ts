// spark-md5 不随包提供类型声明，仓库也没有安装 @types/spark-md5。
// 受「每个工具恰好 8 个文件、不得外新增 d.ts」的约束，只能在此处就地抑制该导入的类型报错。
// @ts-expect-error spark-md5 无类型声明（未安装 @types/spark-md5）
import SparkMD5 from 'spark-md5'
import type { Md5Input, Md5Options } from './schema'

/** 与 schema 保持一致的上限；transform 里再兜一层，防止绕过表单校验的调用 */
const MAX_LENGTH = 200000

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 十六进制转字节；长度为奇数或含非法字符时给出可读报错 */
export function fromHex(text: string): Uint8Array {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0) throw new Error('十六进制长度必须是偶数')
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) throw new Error('不是合法的十六进制字符串')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** 字节转 base64（分块拼接，btoa 只接受 latin1 字符） */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * 计算 MD5 摘要（16 字节）。
 * 文本先按 UTF-8 编码再交给 spark-md5——这样中文/emoji 的摘要与
 * `md5sum`、Node `crypto.createHash('md5')` 等实现一致。
 */
export function md5(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text)
  // 显式切出精确的 ArrayBuffer：TextEncoder 的 buffer 通常是精确的，但不依赖这一点
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return fromHex(SparkMD5.ArrayBuffer.hash(buffer))
}

/** 计算 MD5 并按选项编码输出 */
export function digest(text: string, options: Md5Options): string {
  const bytes = md5(text)
  if (options.format === 'base64') return toBase64(bytes)
  const hex = toHex(bytes)
  return options.uppercase ? hex.toUpperCase() : hex
}

/** 输入为空串时返回空串（边界；避免为空输入也算出一个摘要） */
export function transform(input: Md5Input, options: Md5Options): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_LENGTH) throw new Error('输入超过 200,000 字符上限')
  return digest(input.text, options)
}

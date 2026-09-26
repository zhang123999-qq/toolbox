import type { FileHashInput, FileHashOptions } from './schema'

// spark-md5 不随包提供类型声明，仓库也没有安装 @types/spark-md5。
// 受「每个工具恰好 8 个文件、不得外新增 d.ts」的约束，只能在此处就地抑制该导入的类型报错。
// @ts-expect-error spark-md5 无类型声明（未安装 @types/spark-md5）
import SparkMD5 from 'spark-md5'

/** 支持的摘要算法；WebCrypto 不支持 MD5，故 MD5 走 spark-md5 */
export const ALGORITHMS = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'] as const

/** 输出编码 */
export const FORMATS = ['hex', 'base64'] as const

/** 单文件上限：200 MiB。再大就应改用流式哈希（本工具不提供） */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 文本上限，与 schema 保持一致 */
const MAX_TEXT_LENGTH = 200000

/** String.fromCharCode(...bytes) 的分块大小，避免参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 展示名 → 摘要宽度（用于对齐） */
const LABEL: Record<string, string> = {
  md5: 'MD5',
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
}

/** 字节转十六进制（小写） */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 字节转 base64（分块拼接，btoa 只接受 latin1 字符） */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** 十六进制转字节 */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** 切出精确的 ArrayBuffer：TextEncoder / subarray 的结果 byteOffset 未必为 0 */
function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/**
 * MD5 摘要（16 字节）。
 * WebCrypto 不提供 MD5，故用 spark-md5；它与 `md5sum`、Node crypto 的结果一致。
 */
export function md5Digest(bytes: Uint8Array): Uint8Array {
  return fromHex(SparkMD5.ArrayBuffer.hash(exactBuffer(bytes)))
}

/** SHA 系列摘要：交给浏览器原生 WebCrypto */
async function shaDigest(algorithm: string, bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-' + algorithm.slice(3), exactBuffer(bytes))
  return new Uint8Array(digest)
}

/** 单个算法的摘要字节 */
export async function digestBytes(algorithm: string, bytes: Uint8Array): Promise<Uint8Array> {
  if (algorithm === 'md5') return md5Digest(bytes)
  return shaDigest(algorithm, bytes)
}

/** 选项决定算哪些算法：all → 全部；否则只算一个 */
export function pickAlgorithms(options: FileHashOptions): readonly string[] {
  if (options.algorithm !== 'all') return [options.algorithm]
  return ALGORITHMS
}

/** 摘要字节按选项编码成字符串 */
export function encode(bytes: Uint8Array, options: FileHashOptions): string {
  return options.format === 'base64' ? toBase64(bytes) : toHex(bytes)
}

export interface HashRow {
  readonly algorithm: string
  readonly value: string
}

/** 对同一份字节算出所有选中算法的摘要 */
export async function hashBytes(
  bytes: Uint8Array,
  options: FileHashOptions,
): Promise<readonly HashRow[]> {
  const rows: HashRow[] = []
  for (const algorithm of pickAlgorithms(options)) {
    rows.push({ algorithm, value: encode(await digestBytes(algorithm, bytes), options) })
  }
  return rows
}

/** 千分位整数：1024 → 1,024 */
function group(value: number): string {
  return value.toLocaleString('en-US')
}

/** 摘要行对齐：最长标签 7 字符 */
function pad(label: string): string {
  return label.padEnd(7, ' ')
}

/** 拼最终报告；首行说明来源与体积，其后每行一个算法 */
export function formatReport(header: string, rows: readonly HashRow[]): string {
  return [
    header,
    '',
    ...rows.map((row) => `${pad(LABEL[row.algorithm] ?? row.algorithm)} ${row.value}`),
  ].join('\n')
}

/** 文本模式：按 UTF-8 编码后哈希 */
export async function hashText(text: string, options: FileHashOptions): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const header = `输入：${group(text.length)} 字符 / ${group(bytes.length)} 字节`
  return formatReport(header, await hashBytes(bytes, options))
}

/** 文件模式：读成 ArrayBuffer 后哈希 */
export async function hashFile(file: File, options: FileHashOptions): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `文件过大：${group(file.size)} 字节，超过 ${group(MAX_FILE_BYTES)} 字节上限（大文件请用命令行 sha256sum）`,
    )
  }
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const header = `文件：${file.name}\n大小：${group(file.size)} 字节`
  return formatReport(header, await hashBytes(bytes, options))
}

export async function transform(input: FileHashInput, options: FileHashOptions): Promise<string> {
  if (input.text === '') return ''
  if (input.text.length > MAX_TEXT_LENGTH) throw new Error('输入超过 200,000 字符上限')
  return hashText(input.text, options)
}

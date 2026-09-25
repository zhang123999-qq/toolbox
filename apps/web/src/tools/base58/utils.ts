import type { Base58Input, Base58Options } from './schema'

/**
 * 两套常用字母表。
 * Bitcoin：去掉 `0OIl`（易与 O/1 混淆）——比特币地址、IPFS CID 用它。
 * Flickr：去掉同样的四个字符但把大小写位置对调，短链服务用它。
 */
export const ALPHABETS = {
  bitcoin: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  flickr: '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
} as const

export type AlphabetName = keyof typeof ALPHABETS

/**
 * Base58 本质是「把整串字节当成一个大整数做进制转换」，所以逐字节累加后
 * 用 BigInt 取余输出。JS 的 Number 只有 53 位精度，必须用 BigInt。
 * 前导零字节没有数值意义，按惯例映射成字母表首字符（Bitcoin 下就是 `1`）。
 */
export function encodeBase58(text: string, alphabetName: AlphabetName): string {
  const bytes = new TextEncoder().encode(text)
  if (bytes.length === 0) return ''
  const alphabet = ALPHABETS[alphabetName]
  const base = BigInt(alphabet.length)

  let value = 0n
  for (const byte of bytes) value = value * 256n + BigInt(byte)

  let out = ''
  while (value > 0n) {
    out = alphabet[Number(value % base)] + out
    value /= base
  }

  for (const byte of bytes) {
    if (byte !== 0) break
    out = alphabet[0] + out
  }
  return out
}

/** 解码：容忍空白；遇到字母表之外的字符直接报错 */
export function decodeBase58(text: string, alphabetName: AlphabetName): string {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned === '') return ''
  const alphabet = ALPHABETS[alphabetName]
  const base = BigInt(alphabet.length)

  let value = 0n
  for (const char of cleaned) {
    const index = alphabet.indexOf(char)
    if (index === -1) throw new Error('输入含该字母表之外的字符：' + char)
    value = value * base + BigInt(index)
  }

  const bytes: number[] = []
  while (value > 0n) {
    bytes.unshift(Number(value % 256n))
    value /= 256n
  }
  for (const char of cleaned) {
    if (char !== alphabet[0]) break
    bytes.unshift(0)
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
}

export function transform(input: Base58Input, options: Base58Options): string {
  if (input.text === '') return ''
  try {
    if (options.direction === 'decode') return decodeBase58(input.text, options.mode)
    return encodeBase58(input.text, options.mode)
  } catch {
    throw new Error('解码失败：输入不是合法的 Base58，或解码结果不是合法的 UTF-8 文本')
  }
}

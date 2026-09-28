import type { UuidInput, UuidOptions } from './schema'

/** 数量合法区间 */
export const MIN_COUNT = 1
export const MAX_COUNT = 100

/** 取加密安全随机源，确保存在 randomUUID */
function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.randomUUID) {
    throw new Error('当前环境不支持 crypto.randomUUID，无法生成 UUID')
  }
  return c
}

/** 解析数量选项：1–100 整数 */
export function parseCount(raw: string): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('生成数量必须是整数')
  }
  const n = Number(value)
  if (n < MIN_COUNT || n > MAX_COUNT) {
    throw new Error(`生成数量必须在 ${MIN_COUNT} 到 ${MAX_COUNT} 之间`)
  }
  return n
}

/** 按选项格式化单个 v4 UUID：可选大写、可选去横线 */
export function formatUuid(uuid: string, options: UuidOptions): string {
  let out = uuid
  if (!options.hyphens) out = out.replace(/-/g, '')
  if (options.uppercase) out = out.toUpperCase()
  return out
}

/** 生成 count 个 v4 UUID 并格式化 */
export function generateUuids(options: UuidOptions): string[] {
  const count = parseCount(options.count)
  const c = getCrypto()
  const list: string[] = []
  for (let i = 0; i < count; i += 1) {
    list.push(formatUuid(c.randomUUID(), options))
  }
  return list
}

/** T2 入口：输入留空返回空串；否则每行一个 UUID */
export function transform(input: UuidInput, options: UuidOptions): string {
  if (input.text === '') return ''
  return generateUuids(options).join('\n')
}

import { compare, genSalt, getRounds, hash } from 'bcryptjs'
import type { BcryptInput, BcryptOptions } from './schema'

/** 允许的 cost 取值 */
export const COSTS = ['4', '6', '8', '10', '12'] as const

/** bcrypt 哈希串的形状：$2a$ / $2b$ / $2y$ + 两位 cost + 53 个字符（22 盐 + 31 哈希） */
export const HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

/** 解析 cost，非法取值直接报错 */
export function parseCost(value: string): number {
  if (!(COSTS as readonly string[]).includes(value)) {
    throw new Error('不支持的 cost：' + value + '（可选 4 / 6 / 8 / 10 / 12）')
  }
  return Number(value)
}

/** 生成 bcrypt 哈希（盐随机，故同样的口令每次结果都不同） */
export async function hashPassword(password: string, cost: string): Promise<string> {
  const rounds = parseCost(cost)
  const salt = await genSalt(rounds)
  return hash(password, salt)
}

/**
 * 校验口令：返回结论文案而不是抛错（口令不匹配是正常结果）。
 * 哈希串格式不对才算输入错误，此时抛出可读错误。
 */
export async function verifyPassword(password: string, hashValue: string): Promise<string> {
  if (hashValue.trim() === '') throw new Error('请先粘贴待校验的 bcrypt 哈希')
  if (!HASH_PATTERN.test(hashValue.trim())) {
    throw new Error('不是合法的 bcrypt 哈希：应形如 $2b$10$…（共 60 字符）')
  }
  const ok = await compare(password, hashValue.trim())
  return ok ? '校验通过：口令与哈希匹配' : '校验失败：口令与哈希不匹配'
}

/** 读出哈希串里记录的 cost（用于验证选项确实生效） */
export function readCost(hashValue: string): number {
  return getRounds(hashValue.trim())
}

export async function transform(input: BcryptInput, options: BcryptOptions): Promise<string> {
  if (input.text === '') return ''
  if (options.direction === 'verify') return verifyPassword(input.text, input.hash)
  return hashPassword(input.text, options.cost)
}

/**
 * token-count —— Token 计数的纯函数层
 *
 * 约定：本文件**不静态导入 gpt-tokenizer**（包体积大且只在浏览器端按需加载）。
 * 真正的动态 import('gpt-tokenizer') 只写在 Tool.tsx 里；这里暴露
 * countTokensWithEncode(text, encode)，测试时注入 fake encode 即可。
 */

/** gpt-tokenizer 的 encode 函数形状：文本 → token id 数组 */
export type EncodeFn = (text: string) => readonly number[]

/** 分词器选项（纯数据，供下拉框与 Tool.tsx 的动态导入映射） */
export const TOKENIZER_OPTIONS = [
  { id: 'o200k', label: 'o200k_base（GPT-4o / GPT-4.1 / GPT-5 系列）' },
  { id: 'cl100k', label: 'cl100k_base（GPT-3.5 / GPT-4 系列）' },
] as const

export type TokenizerId = (typeof TOKENIZER_OPTIONS)[number]['id']

/** 单次统计的文本上限字符数 */
export const MAX_TEXT_CHARS = 200_000

/**
 * 用注入的 encode 函数统计 token 数。
 * 空文本返回 0；encode 非函数 / 返回值异常 / 文本超长时抛中文错。
 */
export function countTokensWithEncode(text: string, encode: EncodeFn): number {
  if (typeof encode !== 'function') throw new Error('分词器未加载：encode 不是可用函数')
  if (typeof text !== 'string') throw new Error('待统计内容必须是文本')
  if (text.length === 0) return 0
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`文本过长：${text.length} 字符，超过 ${MAX_TEXT_CHARS} 上限`)
  }
  const ids = encode(text)
  if (!Array.isArray(ids)) throw new Error('分词器返回异常：encode 没有返回数组')
  return ids.length
}

/** token 数 → 中文展示，如 "共 1,234 个 token" */
export function formatTokenCount(count: number): string {
  if (!Number.isInteger(count) || count < 0) throw new Error(`token 数非法：${String(count)}`)
  return `共 ${count.toLocaleString('en-US')} 个 token`
}

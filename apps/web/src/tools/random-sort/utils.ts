import { inputSchema } from './schema'
import type { RandomSortInput, RandomSortOptions } from './schema'

/** 解析待排序项：按行切分，去首尾空白、丢弃空行 */
export function parseItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/**
 * Fisher–Yates 洗牌（返回新数组，不修改输入）。
 * 禁止 `sort(() => Math.random() - 0.5)`：它不是均匀洗牌。
 */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = arr[i]
    arr[i] = arr[j]
    arr[j] = swap
  }
  return arr
}

/** T2 同步入口：空输入返回空串（不进入错误态），否则输出打乱后的行 */
export function transform(
  input: RandomSortInput,
  _options: RandomSortOptions,
  rand: () => number = Math.random,
): string {
  const parsed = inputSchema.parse(input)
  const items = parseItems(parsed.text)
  if (items.length === 0) return ''
  return shuffle(items, rand).join('\n')
}

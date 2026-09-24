import { splitWords } from '../../lib/text'
import type { ShuffleInput, ShuffleOptions } from './schema'

/** FNV-1a：把内容折成一个 32 位种子，用于「可复现」模式 */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32：小而稳的 PRNG，比 Math.random 多一个可控种子 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates 洗牌，返回新数组，不改入参 */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** 按行或按词打乱；勾选「可复现」时用内容哈希做种子，同样的输入必得同样的输出 */
export function transform(input: ShuffleInput, options: ShuffleOptions): string {
  const random = options.stable ? mulberry32(seedFrom(input.text)) : Math.random
  const lines = input.text.split(/\r?\n/)
  if (options.mode === 'word') {
    // 逐行打乱词序，保留行的结构
    return lines.map((line) => shuffle(splitWords(line), random).join(' ')).join('\n')
  }
  return shuffle(lines, random).join('\n')
}

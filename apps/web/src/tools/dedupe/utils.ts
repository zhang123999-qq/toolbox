import type { DedupeInput, DedupeOptions } from './schema'

/** 比较用的键：按需去首尾空白、忽略大小写 */
export function keyOf(line: string, options: DedupeOptions): string {
  const base = options.trimLines ? line.trim() : line
  return options.ignoreCase ? base.toLowerCase() : base
}

/** 按行去重，保留首次出现的顺序 */
export function transform(input: DedupeInput, options: DedupeOptions): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of input.text.split(/\r?\n/)) {
    const key = keyOf(line, options)
    if (key === '') {
      // 空行：不保留则丢弃；保留则也只留第一个
      if (!options.keepEmpty) continue
      if (seen.has('')) continue
      seen.add('')
      out.push(line)
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out.join('\n')
}

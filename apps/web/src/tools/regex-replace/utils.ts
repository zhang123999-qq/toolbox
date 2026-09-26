import type { RegexReplaceInput, RegexReplaceOptions } from './schema'

/** 由三个开关拼出正则标志 */
export function buildFlags(options: RegexReplaceOptions): string {
  return (
    (options.global ? 'g' : '') + (options.ignoreCase ? 'i' : '') + (options.multiline ? 'm' : '')
  )
}

/** 输入非法时抛出，由 UI 捕获展示 */
export class RegexError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegexError'
  }
}

/** 正则替换；替换串里可用 $1、$&、$<name> 等 JS 原生引用 */
export function transform(input: RegexReplaceInput, options: RegexReplaceOptions): string {
  // 空正则会在每个位置匹配到空串，替换结果通常不是用户想要的，直接原样返回
  if (options.pattern === '') return input.text

  let pattern: RegExp
  try {
    pattern = new RegExp(options.pattern, buildFlags(options))
  } catch {
    throw new RegexError(`正则非法：${options.pattern}`)
  }

  try {
    return input.text.replace(pattern, options.replacement)
  } catch (error) {
    // 替换串里的 `$` 引用了不存在的分组时也会抛
    const detail = error instanceof Error ? error.message : String(error)
    throw new RegexError(`替换失败：${detail}`)
  }
}

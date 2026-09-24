import type { RegexReplaceInput, RegexReplaceOptions } from './schema'

/** 由三个开关拼出正则标志 */
export function buildFlags(options: RegexReplaceOptions): string {
  return (
    (options.global ? 'g' : '') + (options.ignoreCase ? 'i' : '') + (options.multiline ? 'm' : '')
  )
}

/** 正则替换；替换串里可用 $1、$&、$<name> 等 JS 原生引用 */
export function transform(input: RegexReplaceInput, options: RegexReplaceOptions): string {
  // 空正则会在每个位置匹配到空串，替换结果通常不是用户想要的，直接原样返回
  if (options.pattern === '') return input.text
  return input.text.replace(new RegExp(options.pattern, buildFlags(options)), options.replacement)
}

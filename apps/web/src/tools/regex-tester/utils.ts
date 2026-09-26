import type { RegexTesterInput, RegexTesterOptions } from './schema'

/** 一个匹配项：命中文本、起止索引、各捕获组 */
export interface MatchItem {
  readonly match: string
  readonly index: number
  readonly end: number
  readonly groups: readonly (string | undefined)[]
}

/** 把 5 个布尔选项拼成 RegExp 的 flags 字符串（顺序固定，便于复现） */
export function buildFlags(options: RegexTesterOptions): string {
  let flags = ''
  if (options.global) flags += 'g'
  if (options.ignoreCase) flags += 'i'
  if (options.multiline) flags += 'm'
  if (options.dotAll) flags += 's'
  if (options.unicode) flags += 'u'
  return flags
}

/** 用给定 flags 编译正则；非法正则抛中文错误 */
export function compile(pattern: string, options: RegexTesterOptions): RegExp {
  try {
    return new RegExp(pattern, buildFlags(options))
  } catch (error) {
    throw new Error('非法正则表达式：' + (error instanceof Error ? error.message : String(error)), {
      cause: error,
    })
  }
}

/** 收集所有匹配：global 时遍历全部，否则只取第一个 */
export function collectMatches(re: RegExp, text: string): MatchItem[] {
  const items: MatchItem[] = []
  if (re.global) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      items.push({
        match: m[0],
        index: m.index,
        end: m.index + m[0].length,
        groups: m.slice(1),
      })
      // 空命中必须前进一步，否则死循环
      if (m[0] === '') re.lastIndex += 1
    }
  } else {
    const m = re.exec(text)
    if (m) {
      items.push({
        match: m[0],
        index: m.index,
        end: m.index + m[0].length,
        groups: m.slice(1),
      })
    }
  }
  return items
}

/** 把匹配列表渲染成可读的命中清单 */
export function renderMatches(items: MatchItem[]): string {
  if (items.length === 0) return '（没有匹配）'
  const lines: string[] = []
  items.forEach((item, i) => {
    lines.push(`#${i + 1}  [${item.index}, ${item.end})  "${item.match}"`)
    item.groups.forEach((g, gi) => {
      lines.push(`      组${gi + 1}: ${g === undefined ? 'undefined' : `"${g}"`}`)
    })
  })
  return lines.join('\n')
}

/** 在原文上用 ⟦ ⟧ 包裹每一段命中，做文本级分组高亮 */
export function annotate(text: string, items: MatchItem[]): string {
  let out = ''
  let cursor = 0
  for (const item of items) {
    if (item.index < cursor) continue
    out += text.slice(cursor, item.index)
    out += '⟦' + text.slice(item.index, item.end) + '⟧'
    cursor = item.end
  }
  out += text.slice(cursor)
  return out
}

/**
 * 主转换：空文本或空正则都返回空串（不进入错误态）；
 * 超长、非法正则抛中文错误，由 TwoColumn 捕获成 role=alert。
 */
export function transform(input: RegexTesterInput, options: RegexTesterOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  if (input.pattern === '') return ''

  const re = compile(input.pattern, options)
  const items = collectMatches(re, input.text)

  return [
    `正则: /${input.pattern}/${buildFlags(options)}`,
    `共 ${items.length} 个匹配`,
    '',
    renderMatches(items),
    '',
    '--- 标注视图（⟦ ⟧ 包裹命中）---',
    annotate(input.text, items),
  ].join('\n')
}

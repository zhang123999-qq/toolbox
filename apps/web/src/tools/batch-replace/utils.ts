import type { BatchReplaceInput, BatchReplaceOptions } from './schema'

/** 正文与规则区的分隔行：独占一行的 --- */
const SPLIT = /^---\s*$/

/** 一条替换规则 */
export interface Rule {
  readonly find: string
  readonly replace: string
}

/** 拆出正文与规则区；没有分隔行时整段都当正文（等价于没有规则） */
export function splitRules(text: string): { body: string; rulesText: string } {
  const lines = text.split(/\r?\n/)
  const index = lines.findIndex((line) => SPLIT.test(line))
  if (index === -1) return { body: text, rulesText: '' }
  return {
    body: lines.slice(0, index).join('\n'),
    rulesText: lines.slice(index + 1).join('\n'),
  }
}

/** 解析规则区：每行一条「查找=>替换」，按第一个 => 切分；没有 => 的行忽略 */
export function parseRules(rulesText: string): Rule[] {
  const rules: Rule[] = []
  for (const raw of rulesText.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    const at = line.indexOf('=>')
    if (at < 0) continue
    const find = line.slice(0, at)
    if (find === '') continue
    rules.push({ find, replace: line.slice(at + 2) })
  }
  return rules
}

/** 字面量替换全部：自己扫描，避免把查找串当正则解析 */
function replaceLiteral(text: string, find: string, replace: string, ignoreCase: boolean): string {
  const haystack = ignoreCase ? text.toLowerCase() : text
  const needle = ignoreCase ? find.toLowerCase() : find
  let out = ''
  let i = 0
  while (i + needle.length <= text.length) {
    if (haystack.startsWith(needle, i)) {
      out += replace
      i += needle.length
    } else {
      out += text[i]
      i += 1
    }
  }
  return out + text.slice(i)
}

/** 应用一条规则；useRegex 时查找串按正则解析（始终带 g） */
export function applyRule(text: string, rule: Rule, options: BatchReplaceOptions): string {
  if (options.useRegex) {
    return text.replace(new RegExp(rule.find, options.ignoreCase ? 'gi' : 'g'), rule.replace)
  }
  return replaceLiteral(text, rule.find, rule.replace, options.ignoreCase)
}

/** 按规则区里的顺序依次替换（后面的规则会看到前面的结果） */
export function transform(input: BatchReplaceInput, options: BatchReplaceOptions): string {
  const { body, rulesText } = splitRules(input.text)
  return parseRules(rulesText).reduce((text, rule) => applyRule(text, rule, options), body)
}

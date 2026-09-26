import type { RegexCrossInput, RegexCrossOptions } from './schema'

/** 解析后的正则：模式串 + flags */
export interface ParsedRegex {
  readonly pattern: string
  readonly flags: string
}

/** 目标语言常量表 */
export const TARGETS = ['python', 'java'] as const

/**
 * 解析输入：支持 `/pattern/flags` 字面量，或纯模式串（无 flags）。
 * 纯模式串里若含 `/` 会按字面量规则贪心匹配最后一个 `/` 后的 flags。
 */
export function parseInput(text: string): ParsedRegex {
  const t = text.trim()
  const m = /^\/(.*)\/([gimsuy]*)$/.exec(t)
  if (m) return { pattern: m[1], flags: m[2] }
  return { pattern: t, flags: '' }
}

/** 校验目标语言 */
export function assertTarget(target: string): void {
  if (!(TARGETS as readonly string[]).includes(target)) {
    throw new Error('不支持的目标语言：' + target)
  }
}

/** Python re 标志：i/m/s 映射；g 在 Python 里不是标志（findall 默认全局） */
export function pyFlags(flags: string): string {
  const out: string[] = []
  if (flags.includes('i')) out.push('re.IGNORECASE')
  if (flags.includes('m')) out.push('re.MULTILINE')
  if (flags.includes('s')) out.push('re.DOTALL')
  return out.length ? out.join(' | ') : '0'
}

/** Java Pattern 标志：i/m/s 映射；g 在 Java 里靠 while(m.find()) 循环 */
export function javaFlags(flags: string): string {
  const out: string[] = []
  if (flags.includes('i')) out.push('Pattern.CASE_INSENSITIVE')
  if (flags.includes('m')) out.push('Pattern.MULTILINE')
  if (flags.includes('s')) out.push('Pattern.DOTALL')
  return out.length ? out.join(' | ') : '0'
}

/** Python 字符串字面量：优先 raw string；含双引号时退回转义普通串 */
export function pyString(pattern: string): string {
  if (pattern.includes('"')) {
    return '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }
  return 'r"' + pattern + '"'
}

/** Java 字符串字面量：反斜杠必须双写，双引号转义 */
export function javaString(pattern: string): string {
  return '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

/** 生成 Python 代码 */
export function toPython(re: ParsedRegex): string {
  return [
    '# Python 3（re 模块）',
    'import re',
    '',
    `pattern = re.compile(${pyString(re.pattern)}, ${pyFlags(re.flags)})`,
    '# 注意：JS 的 g 标志在 Python 中不存在 —— re.findall / re.finditer 默认全局匹配',
    'matches = pattern.findall(text)',
  ].join('\n')
}

/** 生成 Java 代码 */
export function toJava(re: ParsedRegex): string {
  return [
    '// Java（java.util.regex）',
    'import java.util.regex.*;',
    '',
    `Pattern p = Pattern.compile(${javaString(re.pattern)}, ${javaFlags(re.flags)});`,
    '// 注意：JS 的 g 标志在 Java 中不存在 —— 用 while (m.find()) 循环即全局匹配',
    'Matcher m = p.matcher(text);',
    'while (m.find()) {',
    '    // m.group() 整段；m.group(n) 第 n 个分组',
    '}',
  ].join('\n')
}

/** 主转换 */
export function transform(input: RegexCrossInput, options: RegexCrossOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertTarget(options.target)
  const re = parseInput(input.text)
  if (re.pattern === '') return ''
  return options.target === 'python' ? toPython(re) : toJava(re)
}

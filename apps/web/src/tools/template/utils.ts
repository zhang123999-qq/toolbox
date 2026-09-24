import type { TemplateInput, TemplateOptions } from './schema'

/** 模板与变量区的分隔行：独占一行的 --- */
const SPLIT = /^---\s*$/

/** 拆出模板正文与变量区；没有分隔行时整段都当模板 */
export function splitTemplate(text: string): { template: string; varsText: string } {
  const lines = text.split(/\r?\n/)
  const index = lines.findIndex((line) => SPLIT.test(line))
  if (index === -1) return { template: text, varsText: '' }
  return {
    template: lines.slice(0, index).join('\n'),
    varsText: lines.slice(index + 1).join('\n'),
  }
}

/** 解析 key=value 形式的定义；忽略空行与没有等号的行，配对引号会被剥掉 */
export function parseVars(varsText: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const raw of varsText.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars[key] = value
  }
  return vars
}

/** 两种占位符语法：mustache（双花括号）与 dollar（美元符加花括号） */
const PATTERNS: Record<TemplateOptions['syntax'], RegExp> = {
  mustache: /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g,
  dollar: /\$\{\s*([A-Za-z_][\w.-]*)\s*\}/g,
}

/** 替换模板里的占位符 */
export function transform(input: TemplateInput, options: TemplateOptions): string {
  const { template, varsText } = splitTemplate(input.text)
  const vars = parseVars(varsText)
  return template.replace(PATTERNS[options.syntax], (matched, key: string) =>
    key in vars ? vars[key] : options.keepMissing ? matched : '',
  )
}

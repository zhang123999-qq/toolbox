import type { ComplexityInput, ComplexityOptions } from './schema'

/** 决策点关键字：每出现一次 +1（圈复杂度 = 1 + 决策点数） */
const JS_KEYWORDS = [
  // 每个 if( 计一次（含 else if 里的 if——它本身就是一个独立谓词，勿再单列 else if，否则重复计）
  /\bif\s*\(/g,
  /\bfor\s*\(/g,
  /\bfor\s+await\s*\(/g,
  /\bwhile\s*\(/g,
  /\bcase\b/g,
  /\bcatch\s*\(/g,
  // 三元运算符 ? ：排除可选链 ?.（后接 .）与空值合并 ??（前一个/后一个是 ?）
  /(?<![?])\?(?![.?])/g,
]

const JS_OPERATORS = [/&&/g, /\|\|/g, /\?\?/g]

const PY_KEYWORDS = [
  /\bif\b/g,
  /\belif\b/g,
  /\bfor\b/g,
  /\bwhile\b/g,
  /\bexcept\b/g,
  /\breturn\b/g, // 近似：每个 return 也算一个出口
]

function countMatches(source: string, regexes: RegExp[]): number {
  let n = 0
  for (const re of regexes) {
    const m = source.match(re)
    if (m) n += m.length
  }
  return n
}

/** 粗略按 function / def 切分函数块（不做完整 AST） */
function splitFunctions(source: string, language: string): Array<{ name: string; body: string }> {
  const funcs: Array<{ name: string; body: string }> = []
  if (language === 'python') {
    const lines = source.split('\n')
    let current: { name: string; body: string } | null = null
    for (const line of lines) {
      const m = line.match(/^\s*def\s+([A-Za-z0-9_]+)\s*\(/)
      if (m) {
        current = { name: m[1], body: line }
        funcs.push(current)
      } else if (current) {
        current.body += '\n' + line
      }
    }
  } else {
    // JS/TS：function name / name = ( => / name() {
    const re =
      /(?:function\s+([A-Za-z0-9_]+)|(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(source)) !== null) {
      const name = m[1] ?? m[2] ?? 'anonymous'
      funcs.push({ name, body: source.slice(m.index, Math.min(m.index + 800, source.length)) })
    }
  }
  return funcs
}

/** 单个函数体的圈复杂度 */
export function complexityOf(body: string, language: string): number {
  let score = 1
  if (language === 'python') {
    score += countMatches(body, PY_KEYWORDS)
  } else {
    score += countMatches(body, JS_KEYWORDS)
    score += countMatches(body, JS_OPERATORS)
  }
  return score
}

export function rating(score: number): string {
  if (score <= 5) return 'A（清晰）'
  if (score <= 10) return 'B（可接受）'
  if (score <= 20) return 'C（复杂，考虑拆分）'
  return 'D（高风险，必须重构）'
}

export function analyze(source: string, language: string): string {
  const funcs = splitFunctions(source, language)
  const lines: string[] = []
  const total = complexityOf(source, language)
  lines.push(`整体圈复杂度：${total}  →  ${rating(total)}`)
  lines.push('')
  if (funcs.length === 0) {
    lines.push('未识别到函数定义，给出整体评分。')
  } else {
    lines.push('函数级明细：')
    for (const f of funcs) {
      const c = complexityOf(f.body, language)
      lines.push(`  ${f.name}：${c}  →  ${rating(c)}`)
    }
  }
  return lines.join('\n')
}

export function transform(input: ComplexityInput, options: ComplexityOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return analyze(input.text, options.language)
}

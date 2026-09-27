import { evaluate, format } from 'mathjs'
import type { CalculatorInput, CalculatorOptions } from './schema'

/** T2 同步入口：mathjs 求值，format 压平浮点噪声（如 0.1+0.2 → 0.3） */
export function transform(input: CalculatorInput, _options: CalculatorOptions): string {
  const expr = input.text.trim()
  if (expr === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  try {
    return format(evaluate(expr), { precision: 14 })
  } catch {
    throw new Error(
      '表达式无效，请检查语法（支持 + - * / % ^ () 与 sin cos tan sqrt log ln pi e ! 等）',
    )
  }
}

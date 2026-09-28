import { inputSchema } from './schema'
import type { FlowchartOptions } from './schema'

/** Mermaid 源码长度上限（字符）：超出后截断并在 UI 提示 */
export const MAX_CODE_LENGTH = 20_000

/** 支持的方向 */
export type Direction = 'TB' | 'LR'

/** 内置示例 */
export const EXAMPLES: readonly string[] = [
  `A[开始] --> B{判断}
B -->|是| C[结束]
B -->|否| D[重试]
D --> B`,
  `A[输入] --> B[处理]
B --> C[输出]
C --> D[结束]`,
]

/** 解析方向：TB / LR，留空默认 TB */
export function parseDirection(raw: string): Direction {
  const v = raw.trim().toUpperCase()
  if (v === '' || v === 'TB') return 'TB'
  if (v === 'LR') return 'LR'
  throw new Error(`方向非法：${raw}（须为 TB / LR）`)
}

/** prepareCode 的返回：截断后的代码、是否发生截断、是否补了头部 */
export interface PreparedCode {
  readonly code: string
  readonly truncated: boolean
}

/** 检测首行是否已是 flowchart/graph 指令（带方向） */
function hasDirective(code: string): boolean {
  const first = code.split('\n')[0].trim().toLowerCase()
  return /^(flowchart|graph)\s+(tb|bt|lr|rl|td)\b/.test(first)
}

/**
 * 预处理用户输入：Zod 校验 → trim → 超长截断 → 自动补全 flowchart 头部。
 * 若用户没写 `flowchart TD/LR` 之类的头部，按所选 direction 自动补上。
 * 空输入返回空 code（UI 显示引导文案，不视为错误）。
 */
export function prepareCode(raw: string, options: FlowchartOptions): PreparedCode {
  const parsed = inputSchema.parse({ text: raw })
  const direction = parseDirection(options.direction)
  let code = parsed.text.trim()
  if (code === '') return { code: '', truncated: false }

  if (!hasDirective(code)) {
    code = `flowchart ${direction}\n` + code
  }

  if (code.length <= MAX_CODE_LENGTH) {
    return { code, truncated: false }
  }
  return { code: code.slice(0, MAX_CODE_LENGTH), truncated: true }
}

/**
 * 校验 flowchart 代码（错误信息内联中文）：
 * - 空代码 → 提示输入
 * 自动补全后必然以 flowchart 开头，无需再校验指令。
 */
export function validate(code: string): void {
  if (code.trim() === '') {
    throw new Error('代码为空，请输入 Mermaid flowchart 代码')
  }
}

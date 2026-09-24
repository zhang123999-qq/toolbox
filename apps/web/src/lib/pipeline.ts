/**
 * 文本流水线的共用原语。
 *
 * #70「文本工作台」要把多个处理步骤串起来跑，而这些步骤（去空行、去重、排序…）
 * 与 #59 / #60 等单功能工具是同一批操作。按 DEVELOPMENT.md §8.4「工具之间禁止
 * 互相 import，共用逻辑一律上提到 lib」，把这些行级原语放在这里，
 * 由工作台与单功能工具共同复用。
 *
 * 这里只放与 UI 无关的纯函数：输入 string[]，输出 string[]。
 */
import { stripZeroWidth } from './zerowidth'

/** 一个流水线步骤：`name` 或 `name=value` */
export interface Step {
  readonly name: string
  readonly value: string
}

/** 支持的步骤名与其含义，同时用于报错提示 */
export const STEP_HELP: readonly (readonly [string, string])[] = [
  ['trim', '每行去掉首尾空白'],
  ['drop-empty', '删除空行'],
  ['squeeze-empty', '连续空行压成一个'],
  ['dedupe', '重复行只留首次出现'],
  ['sort', '行升序'],
  ['sort-desc', '行降序'],
  ['reverse', '行倒序'],
  ['upper', '转大写'],
  ['lower', '转小写'],
  ['strip-zero-width', '去掉零宽与方向控制字符'],
  ['prefix=X', '每行加前缀 X'],
  ['suffix=X', '每行加后缀 X'],
  ['replace=A>B', '把 A 替换成 B（按书写顺序）'],
  ['take=N', '只保留前 N 行'],
  ['drop=N', '丢掉前 N 行'],
]

/** 空行：去掉 CR 后只剩空白的行 */
export function isBlank(line: string): boolean {
  return line.replace(/\r$/, '').trim() === ''
}

/** 删除空行 */
export function dropEmpty(lines: readonly string[]): string[] {
  return lines.filter((line) => !isBlank(line))
}

/** 连续空行压成一个；压出来的空行统一写成真空行 */
export function squeezeEmpty(lines: readonly string[]): string[] {
  const out: string[] = []
  let lastBlank = false
  for (const line of lines) {
    const blank = isBlank(line)
    if (blank && lastBlank) continue
    out.push(blank ? '' : line)
    lastBlank = blank
  }
  return out
}

/** 去重保序（可先归一化） */
export function dedupeLines(
  lines: readonly string[],
  keyOf: (line: string) => string = (line) => line,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    const key = keyOf(line)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

/** 排序：用码点序而非 localeCompare，避免不同 ICU 数据导致结果漂移 */
export function sortLines(lines: readonly string[], desc = false): string[] {
  return [...lines].sort((a, b) =>
    desc ? (a < b ? 1 : a > b ? -1 : 0) : a < b ? -1 : a > b ? 1 : 0,
  )
}

/** 逐行去掉零宽与方向控制字符 */
export function stripZeroWidthLines(lines: readonly string[]): string[] {
  return lines.map((line) => stripZeroWidth(line))
}

/** 解析步骤文本：每行一条，`name` 或 `name=value`；空行与 `#` 开头的注释行跳过 */
export function parseSteps(text: string): Step[] {
  const steps: Step[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const eq = line.indexOf('=')
    // 值里有意义的空格（如 prefix=- ）要保留，故只在名字一侧 trim
    if (eq < 0) steps.push({ name: line.trim(), value: '' })
    else steps.push({ name: line.slice(0, eq).trim(), value: line.slice(eq + 1) })
  }
  return steps
}

/** 已知步骤名（不含带参数的那些的前缀判断） */
const KNOWN = new Set(STEP_HELP.map(([name]) => name.split('=')[0]))

/** 对单行数组施加一个步骤；返回 null 表示步骤名不认识 */
export function applyStep(lines: readonly string[], step: Step): string[] | null {
  switch (step.name) {
    case 'trim':
      return lines.map((line) => line.trim())
    case 'drop-empty':
      return dropEmpty(lines)
    case 'squeeze-empty':
      return squeezeEmpty(lines)
    case 'dedupe':
      return dedupeLines(lines)
    case 'sort':
      return sortLines(lines, false)
    case 'sort-desc':
      return sortLines(lines, true)
    case 'reverse':
      return [...lines].reverse()
    case 'upper':
      return lines.map((line) => line.toUpperCase())
    case 'lower':
      return lines.map((line) => line.toLowerCase())
    case 'strip-zero-width':
      return stripZeroWidthLines(lines)
    case 'prefix':
      return lines.map((line) => step.value + line)
    case 'suffix':
      return lines.map((line) => line + step.value)
    case 'replace': {
      const gt = step.value.indexOf('>')
      if (gt < 0) return null
      const from = step.value.slice(0, gt)
      const to = step.value.slice(gt + 1)
      if (from === '') return null
      return lines.map((line) => line.split(from).join(to))
    }
    case 'take': {
      const n = Number(step.value)
      if (!Number.isFinite(n) || n < 0) return null
      return lines.slice(0, n)
    }
    case 'drop': {
      const n = Number(step.value)
      if (!Number.isFinite(n) || n < 0) return null
      return lines.slice(n)
    }
    default:
      // 已知但当前无需改动的步骤（理论上走不到）：复制一份，保持返回可变数组
      return KNOWN.has(step.name) ? [...lines] : null
  }
}

/** 一个阶段的结果：步骤名、跑完之后的文本、以及本阶段是否改动了内容 */
export interface Stage {
  readonly label: string
  readonly text: string
  readonly changed: boolean
}

export interface PipelineResult {
  readonly stages: readonly Stage[]
  readonly final: string
  /** 不认识的步骤，按出现顺序给出 */
  readonly errors: readonly string[]
}

/** 跑完整条流水线：逐步作用于行数组，记录每个阶段的结果 */
export function runPipeline(text: string, stepsText: string): PipelineResult {
  const steps = parseSteps(stepsText)
  const stages: Stage[] = []
  const errors: string[] = []
  let lines: string[] = text.split(/\r?\n/)
  let current = lines.join('\n')

  for (const step of steps) {
    const next = applyStep(lines, step)
    const label = step.value === '' ? step.name : step.name + '=' + step.value
    if (next === null) {
      errors.push(label)
      continue
    }
    lines = next
    const joined = lines.join('\n')
    stages.push({ label, text: joined, changed: joined !== current })
    current = joined
  }
  return { stages, final: current, errors }
}

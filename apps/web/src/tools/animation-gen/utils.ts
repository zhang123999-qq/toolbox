import type { AnimationGenInput, AnimationGenOptions } from './schema'

const MAX_INPUT = 200_000

/** 校验动画名：只允许字母数字连字符，避免注入 */
export function assertName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') return 'fadeIn'
  if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(trimmed)) return trimmed
  throw new Error('动画名格式非法：请用字母开头，仅含字母数字连字符')
}

/** 校验时间值：如 1s / 500ms */
export function assertTime(value: string, name: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return '0s'
  if (/^\d+(\.\d+)?(s|ms)$/.test(trimmed)) return trimmed
  throw new Error(`${name} 格式非法：请输入如 1s / 500ms`)
}

/** 把 "opacity:0; transform:translateX(10px)" 按分号拆成缩进行 */
export function splitDecls(block: string): string[] {
  return block
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `    ${s};`)
}

export function buildAnimation(options: AnimationGenOptions): string {
  const name = assertName(options.name)
  const duration = assertTime(options.duration, '时长')
  const delay = assertTime(options.delay, '延迟')
  const fromLines = splitDecls(options.from)
  const toLines = splitDecls(options.to)
  if (fromLines.length === 0 || toLines.length === 0) {
    throw new Error('关键帧 from / to 不能为空：请至少写一条声明')
  }

  const keyframes = [
    `@keyframes ${name} {`,
    '  from {',
    ...fromLines,
    '  }',
    '  to {',
    ...toLines,
    '  }',
    '}',
  ].join('\n')

  const animationShorthand = `.${name} {\n  animation: ${duration} ${options.timing} ${delay} ${options.iteration} ${options.direction} ${name};\n}`

  return `${keyframes}\n\n${animationShorthand}`
}

export function transform(input: AnimationGenInput, options: AnimationGenOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildAnimation(options)
}

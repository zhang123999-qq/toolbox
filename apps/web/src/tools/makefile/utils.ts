import type { MakefileInput, MakefileOptions } from './schema'

const MAX_INPUT = 200_000

/** 目标名必须是合法的标识符：字母数字下划线中划线点 */
const TARGET_RE = /^[A-Za-z0-9_.-]+$/

/** 校验选项，非法即抛中文错误 */
export function assertOptions(options: MakefileOptions): void {
  if (!TARGET_RE.test(options.targetName.trim())) {
    throw new Error('目标名只能包含字母、数字、下划线、中划线与点')
  }
  if (options.command.trim() === '') {
    throw new Error('命令不能为空')
  }
  // 依赖名也必须是合法标识符，防止含 “;” 等注入内联配方或破坏 Makefile 语法
  for (const dep of parseDeps(options.deps)) {
    if (!TARGET_RE.test(dep)) {
      throw new Error(`依赖名只能包含字母、数字、下划线、中划线与点：${dep}`)
    }
  }
}

/** 把一行依赖串拆成数组（空白分隔），去重保序 */
export function parseDeps(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const dep of raw
    .split(/\s+/)
    .map((d) => d.trim())
    .filter(Boolean)) {
    if (!seen.has(dep)) {
      seen.add(dep)
      out.push(dep)
    }
  }
  return out
}

/** 生成 Makefile 文本（配方行必须以 Tab 开头） */
export function buildMakefile(options: MakefileOptions): string {
  assertOptions(options)
  const target = options.targetName.trim()
  const deps = parseDeps(options.deps)
  const depPart = deps.length > 0 ? ' ' + deps.join(' ') : ''
  const recipe = options.command
    .split('\n')
    .map((line) => '\t' + line.replace(/^\t+/, ''))
    .join('\n')

  return [
    '# 由工具生成的 Makefile',
    '# 变量区：可按需覆盖（make build APP=foo）',
    'APP := myapp',
    '',
    '.PHONY: ' + target,
    target + ':' + depPart,
    recipe,
    '',
  ].join('\n')
}

export function transform(input: MakefileInput, options: MakefileOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildMakefile(options)
}

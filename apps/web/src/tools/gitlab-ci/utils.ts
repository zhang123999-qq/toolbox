import type { GitlabCiInput, GitlabCiOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

const MAX_INPUT = 200_000

/** 校验镜像名：Docker 镜像引用只允许小写字母数字 . : / _ -，避免引号/换行破坏 YAML */
export function normalizeImage(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return 'node:20'
  if (/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(trimmed)) return trimmed
  throw new Error(`镜像名格式非法：${trimmed}（应为如 node:20 / registry.example.com/org/img:tag）`)
}

/** 解析 stages：逗号分隔 → 列表 */
export function parseStages(raw: string): string[] {
  const list = raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (list.length === 0) throw new Error('stages 不能为空：如 build,test,deploy')
  for (const s of list) {
    if (!/^[a-zA-Z0-9_-]+$/.test(s)) throw new Error(`stage 名非法：${s}`)
  }
  return list
}

/** 解析脚本：每行一条命令；拒绝控制字符，调用方负责 YAML 安全引用 */
export function parseScript(raw: string): string[] {
  const list = raw
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (list.length === 0) throw new Error('脚本步骤不能为空：每行一条命令')
  for (const s of list) {
    if (hasControlChar(s)) throw new Error(`脚本行包含非法控制字符：${s}`)
  }
  return list
}

export function buildGitlabCi(options: GitlabCiOptions): string {
  const image = normalizeImage(options.image)
  const stages = parseStages(options.stages)
  const script = parseScript(options.script)
  const stage0 = stages[0] as string

  return [
    `image: ${image}`,
    '',
    'stages:',
    ...stages.map((s) => `  - ${s}`),
    '',
    'build_job:',
    `  stage: ${stage0}`,
    '  script:',
    // 用户命令以 YAML 双引号标量输出，避免含 : # 等字符破坏 YAML 结构
    ...script.map((s) => `    - ${JSON.stringify(s)}`),
  ].join('\n')
}

export function transform(input: GitlabCiInput, options: GitlabCiOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildGitlabCi(options)
}

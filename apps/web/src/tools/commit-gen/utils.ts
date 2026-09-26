import { COMMIT_TYPES } from './schema'
import type { CommitGenOptions } from './schema'

export function assertType(type: string): void {
  if (!(COMMIT_TYPES as readonly string[]).includes(type)) {
    throw new Error('不支持的提交类型：' + type)
  }
}

/** 生成符合 Conventional Commits 的提交信息 */
export function buildCommit(options: CommitGenOptions): string {
  assertType(options.type)
  const description = options.description.trim()
  if (!description) throw new Error('请填写提交描述（subject）')

  const scope = options.scope.trim()
  const header = scope
    ? `${options.type}(${scope}): ${description}`
    : `${options.type}: ${description}`

  const parts: string[] = [header]
  const body = options.body.trim()
  if (body) parts.push('', body)
  if (options.breaking) parts.push('', 'BREAKING CHANGE: 本次提交包含不兼容的 API 变更')
  const footer = options.footer.trim()
  if (footer) parts.push('', footer)
  return parts.join('\n')
}

export function transform(input: { text: string }, options: CommitGenOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return buildCommit(options)
}

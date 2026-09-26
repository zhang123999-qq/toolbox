import type { GitDiffOptions } from './schema'

export interface FileStat {
  readonly path: string
  readonly status: 'added' | 'deleted' | 'modified'
  readonly added: number
  readonly removed: number
}

export interface DiffSummary {
  readonly files: readonly FileStat[]
  readonly totalAdded: number
  readonly totalRemoved: number
}

/** 从 `diff --git a/foo b/foo` 提取路径（取 b/ 侧） */
function parseDiffGit(line: string): string | null {
  const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/)
  return m ? (m[2] as string) : null
}

/** 从 `+++ b/foo` 或 `+++ /dev/null` 提取路径 */
function parsePlus(line: string): string | null {
  const m = line.match(/^\+\+\+ (?:b\/|a\/)?(.+)$/)
  if (!m) return null
  const path = m[1] as string
  return path === '/dev/null' ? null : path
}

/**
 * 解析统一 diff。
 * 规则：以 `diff --git` 为文件边界；`new file mode` → added；
 * `deleted file mode` → deleted；其余 → modified。
 * 以 `+`/`-` 开头且不是 `+++`/`---` 的行计入增删。
 */
export function parseDiff(text: string): DiffSummary {
  const lines = text.split(/\r?\n/)
  const files: FileStat[] = []
  let current: FileStat | null = null
  let sawAnyHunk = false

  const flush = () => {
    if (current) files.push(current)
    current = null
  }

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      flush()
      const path = parseDiffGit(line) ?? 'unknown'
      current = { path, status: 'modified', added: 0, removed: 0 }
      continue
    }
    if (!current) continue
    if (line.startsWith('new file mode')) {
      current = { ...current, status: 'added' }
      continue
    }
    if (line.startsWith('deleted file mode')) {
      current = { ...current, status: 'deleted' }
      continue
    }
    if (line.startsWith('+++') || line.startsWith('---')) {
      if (line.startsWith('+++')) {
        const p = parsePlus(line)
        if (p && current.path === 'unknown') current = { ...current, path: p }
      }
      continue
    }
    if (line.startsWith('@@')) {
      sawAnyHunk = true
      continue
    }
    // 注意：+++ / --- 表头已在上面 continue 掉；此处凡以单个 + 或 - 开头者
    // 均为内容行（包括内容本身以 + / - 开头而形如 ++foo / --bar 的行），计入增删。
    if (line.startsWith('+')) current = { ...current, added: current.added + 1 }
    else if (line.startsWith('-')) current = { ...current, removed: current.removed + 1 }
  }
  flush()

  if (files.length === 0 && !sawAnyHunk) {
    throw new Error('不是合法的 git diff 输出（缺少 diff --git 或 @@ 块）')
  }

  return {
    files,
    totalAdded: files.reduce((n, f) => n + f.added, 0),
    totalRemoved: files.reduce((n, f) => n + f.removed, 0),
  }
}

const STATUS_LABEL: Record<FileStat['status'], string> = {
  added: '新增',
  deleted: '删除',
  modified: '修改',
}

export function transform(input: { text: string }, options: GitDiffOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const summary = parseDiff(input.text)
  const out: string[] = []
  out.push(`变更文件：${summary.files.length} 个`)
  out.push(`新增行：+${summary.totalAdded}`)
  out.push(`删除行：-${summary.totalRemoved}`)
  out.push('')
  out.push('文件 | 状态 | 新增 | 删除')
  out.push('--- | --- | --- | ---')
  for (const f of summary.files) {
    out.push(`${f.path} | ${STATUS_LABEL[f.status]} | +${f.added} | -${f.removed}`)
  }
  if (options.verbose) {
    out.push('')
    out.push('# 说明')
    out.push('# - 以 diff --git 识别文件边界')
    out.push('# - new file / deleted file 分别记为 新增 / 删除')
    out.push('# - +++ 与 --- 表头行不计入增删')
  }
  return out.join('\n')
}

import type { DuplicateCodeInput, DuplicateCodeOptions } from './schema'

/** 简单字符串 hash（djb2），用于行级指纹 */
export function hashLine(line: string): number {
  let h = 5381
  for (let i = 0; i < line.length; i += 1) {
    h = ((h << 5) + h + line.charCodeAt(i)) | 0
  }
  return h >>> 0
}

export interface DupReport {
  totalLines: number
  nonEmptyLines: number
  duplicateLines: number
  duplicateRate: number
  blocks: Array<{ hash: number; count: number; sample: string }>
}

/** 去掉行首尾空白后取 hash；空行不计入 */
export function fingerprints(source: string): Array<{ no: number; hash: number; text: string }> {
  const out: Array<{ no: number; hash: number; text: string }> = []
  source.split('\n').forEach((raw, idx) => {
    const trimmed = raw.trim()
    if (trimmed === '') return
    out.push({ no: idx + 1, hash: hashLine(trimmed), text: trimmed })
  })
  return out
}

export function analyze(source: string, minBlock: number): DupReport {
  const fps = fingerprints(source)
  const byHash = new Map<number, { count: number; sample: string }>()
  for (const f of fps) {
    const entry = byHash.get(f.hash)
    if (entry) entry.count += 1
    else byHash.set(f.hash, { count: 1, sample: f.text })
  }

  let duplicateLines = 0
  const blocks: Array<{ hash: number; count: number; sample: string }> = []
  for (const [hash, entry] of byHash) {
    if (entry.count >= minBlock) {
      duplicateLines += entry.count
      blocks.push({ hash, count: entry.count, sample: entry.sample })
    }
  }
  blocks.sort((a, b) => b.count - a.count)

  const nonEmpty = fps.length
  return {
    totalLines: source.split('\n').length,
    nonEmptyLines: nonEmpty,
    duplicateLines,
    duplicateRate: nonEmpty ? duplicateLines / nonEmpty : 0,
    blocks,
  }
}

export function render(r: DupReport): string {
  const lines: string[] = []
  lines.push('重复代码检测：')
  lines.push(`  总行数：${r.totalLines}`)
  lines.push(`  非空行：${r.nonEmptyLines}`)
  lines.push(`  重复行（出现 ≥ 阈值的行）：${r.duplicateLines}`)
  lines.push(`  重复率：${(r.duplicateRate * 100).toFixed(1)}%`)
  lines.push('')
  if (r.blocks.length === 0) {
    lines.push('未发现达到阈值的重复行块。')
  } else {
    lines.push('重复行块（按出现次数倒序，前 10 条）：')
    for (const b of r.blocks.slice(0, 10)) {
      const sample = b.sample.length > 60 ? b.sample.slice(0, 60) + '…' : b.sample
      lines.push(`  ×${b.count}  ${sample}`)
    }
  }
  return lines.join('\n')
}

export function transform(input: DuplicateCodeInput, options: DuplicateCodeOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return render(analyze(input.text, options.minBlock))
}

/**
 * i18n-diff（#727）纯函数：双语 JSON 差异分析。
 *
 * 先拍平为点路径条目再对比，输出缺失 / 多余 / 空值 / 未翻译四类明细与统计。
 */

export type DiffKind = 'missing' | 'extra' | 'empty' | 'untranslated'

export interface I18nDiffItem {
  readonly kind: DiffKind
  readonly key: string
  readonly baseValue: string
  readonly targetValue: string
}

export interface I18nDiffResult {
  readonly missingKeys: string[]
  readonly extraKeys: string[]
  readonly emptyValues: string[]
  readonly untranslatedKeys: string[]
  readonly totalBase: number
  readonly totalTarget: number
  readonly translatedCount: number
  /** 翻译完成率（0–100，基准为空时为 100） */
  readonly completionRate: number
  readonly items: readonly I18nDiffItem[]
}

export const DIFF_KIND_LABELS: Readonly<Record<DiffKind, string>> = {
  missing: '缺失',
  extra: '多余',
  empty: '空值',
  untranslated: '未翻译',
}

/** 拍平嵌套对象为 key → value（字符串化）。顶层非对象 / 数组值抛中文错。 */
function flattenEntries(value: unknown): Map<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('输入必须是 JSON 对象')
  }
  const out = new Map<string, string>()
  const walk = (node: unknown, path: string): void => {
    if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
      for (const k of Object.keys(node as Record<string, unknown>)) {
        walk((node as Record<string, unknown>)[k], path === '' ? k : `${path}.${k}`)
      }
      return
    }
    if (Array.isArray(node)) throw new Error(`键「${path}」是数组：暂不支持数组结构`)
    if (node === null || node === undefined) throw new Error(`键「${path}」的值为空`)
    out.set(path, String(node))
  }
  walk(value, '')
  return out
}

function parseJsonObject(input: string, label: string): Map<string, string> {
  if (input.trim() === '') throw new Error(`请粘贴${label} JSON`)
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    throw new Error(`${label} JSON 解析失败：请检查括号、引号与逗号`)
  }
  return flattenEntries(data)
}

/**
 * 对比基准语言与目标语言的 JSON。返回四类差异与完成率。
 */
export function diffI18n(baseJson: string, targetJson: string): I18nDiffResult {
  const base = parseJsonObject(baseJson, '基准')
  const target = parseJsonObject(targetJson, '目标')
  const missingKeys: string[] = []
  const extraKeys: string[] = []
  const emptyValues: string[] = []
  const untranslatedKeys: string[] = []
  const items: I18nDiffItem[] = []

  for (const [key, baseValue] of base) {
    if (!target.has(key)) {
      missingKeys.push(key)
      items.push({ kind: 'missing', key, baseValue, targetValue: '' })
    } else {
      const targetValue = target.get(key) as string
      if (targetValue === '') {
        emptyValues.push(key)
        items.push({ kind: 'empty', key, baseValue, targetValue })
      } else if (targetValue === baseValue) {
        untranslatedKeys.push(key)
        items.push({ kind: 'untranslated', key, baseValue, targetValue })
      }
    }
  }
  for (const [key, targetValue] of target) {
    if (!base.has(key)) {
      extraKeys.push(key)
      items.push({ kind: 'extra', key, baseValue: '', targetValue })
    }
  }

  const translatedCount = base.size - missingKeys.length - emptyValues.length - untranslatedKeys.length
  const completionRate = base.size === 0 ? 100 : Math.round((translatedCount / base.size) * 1000) / 10
  return {
    missingKeys,
    extraKeys,
    emptyValues,
    untranslatedKeys,
    totalBase: base.size,
    totalTarget: target.size,
    translatedCount,
    completionRate,
    items,
  }
}

/**
 * 把差异结果渲染为文本报告（供输出区 / 复制 / 下载）。
 */
export function formatDiffResult(result: I18nDiffResult): string {
  const lines: string[] = [
    `基准条目：${result.totalBase} 目标条目：${result.totalTarget} 已翻译：${result.translatedCount} 完成率：${result.completionRate}%`,
    '',
  ]
  const sections: Array<[DiffKind, string[]]> = [
    ['missing', result.missingKeys],
    ['extra', result.extraKeys],
    ['empty', result.emptyValues],
    ['untranslated', result.untranslatedKeys],
  ]
  for (const [kind, keys] of sections) {
    lines.push(`${DIFF_KIND_LABELS[kind]}（${keys.length}）：`)
    if (keys.length === 0) {
      lines.push('  无')
    } else {
      for (const k of keys) lines.push(`  - ${k}`)
    }
    lines.push('')
  }
  if (result.items.length === 0) {
    lines.push('两份 JSON 完全一致，无差异。')
  }
  return lines.join('\n')
}

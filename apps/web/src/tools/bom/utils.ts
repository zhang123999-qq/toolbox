import type { BomInput, BomOptions } from './schema'

/** 字节顺序标记：UTF-8 里它是可选的，但很多工具链对它有意见 */
export const BOM = '﻿'

/** 文本开头是否带 BOM */
export function hasBom(text: string): boolean {
  return text.startsWith(BOM)
}

/** 全文 U+FEFF 出现次数（正常文本里不该出现，多了多半是拼接或复制残留） */
export function countBom(text: string): number {
  return [...text].filter((ch) => ch === BOM).length
}

/** 加 BOM：已有就不重复加 */
export function addBom(text: string): string {
  return hasBom(text) ? text : BOM + text
}

/** 移除开头的 BOM；开头的没有就原样返回 */
export function removeBom(text: string): string {
  return hasBom(text) ? text.slice(1) : text
}

/** 检测 / 添加 / 移除 */
export function transform(input: BomInput, options: BomOptions): string {
  if (input.text === '') return ''
  if (options.mode === 'add') return addBom(input.text)
  if (options.mode === 'remove') return removeBom(input.text)
  const total = countBom(input.text)
  return [
    hasBom(input.text) ? '开头有 BOM（U+FEFF）' : '开头没有 BOM',
    '全文 U+FEFF 出现次数：' + total,
    total > 1
      ? '注意：除了开头，正文里还有 ' + (total - (hasBom(input.text) ? 1 : 0)) + ' 处 U+FEFF。'
      : '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

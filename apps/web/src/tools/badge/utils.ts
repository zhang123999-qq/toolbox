import type { BadgeInput, BadgeOptions } from './schema'

/** Shields.io URL 里需要转义的字符：- 当分隔符，_ 空格 */
function encodeSegment(value: string): string {
  return value
    .trim()
    .replace(/-/g, '--')
    .replace(/_/g, '__')
    .replace(/ /g, '_')
    .replace(/%/g, '%25')
}

export function badgeUrl(options: BadgeOptions): string {
  const label = encodeSegment(options.label || 'label')
  const message = encodeSegment(options.message || 'message')
  const color = encodeSegment(options.color || 'brightgreen')
  return `https://img.shields.io/badge/${label}-${message}-${color}`
}

export function buildBadge(options: BadgeOptions): string {
  const url = badgeUrl(options)
  return [
    '# Badge URL',
    url,
    '',
    '# Markdown',
    `![${options.label || ''} ${options.message || ''}](${url})`,
    '',
    '# HTML',
    `<img src="${url}" alt="${options.label} ${options.message}" />`,
  ].join('\n')
}

export function transform(input: BadgeInput, options: BadgeOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return buildBadge(options)
}

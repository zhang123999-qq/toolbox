import { countText } from '../../lib/text'
import type { TtsOptions } from './schema'

/**
 * 估算朗读时长（秒）。
 * 中文按每分钟 240 字、拉丁按每分钟 150 词折算，再按语速缩放；
 * 只是量级估算，真实时长取决于所用语音引擎。
 */
export function estimateSeconds(text: string, rate: number): number {
  const counts = countText(text)
  const units = counts.cjk / 240 + counts.latinWords / 150
  const seconds = units * 60
  return seconds === 0 ? 0 : seconds / Math.max(0.1, rate)
}

/**
 * 把长文本切成若干段：句号、问号、感叹号、换行都当切点。
 * 语音合成对超长 utterance 支持不稳定，分段逐条念更稳。
 */
export function chunkText(text: string, maxLength: number): string[] {
  const pieces = text.split(/(?<=[。！？!?；;\n])/)
  const out: string[] = []
  let current = ''
  const flush = () => {
    if (current.trim() !== '') out.push(current)
    current = ''
  }
  for (const piece of pieces) {
    // 单句本身就超长（无标点的长串）：先按上限硬切，再继续按句拼
    let rest = piece
    while (rest.length > maxLength) {
      flush()
      out.push(rest.slice(0, maxLength))
      rest = rest.slice(maxLength)
    }
    if (current !== '' && current.length + rest.length > maxLength) flush()
    current += rest
  }
  flush()
  return out
}

/** 语音的展示名：优先给「名称（语言）」 */
export function voiceLabel(name: string, lang: string): string {
  return lang === '' ? name : name + '（' + lang + '）'
}

/** 朗读结果报告：字数、语速、分段数、估算时长 */
export function report(text: string, options: TtsOptions, voiceName: string): string {
  const counts = countText(text)
  const chunks = chunkText(text, 200)
  const seconds = estimateSeconds(text, Number(options.rate) || 1)
  return [
    '已朗读：' +
      counts.chars +
      ' 字符（中文 ' +
      counts.cjk +
      ' 字、拉丁词 ' +
      counts.latinWords +
      ' 个）',
    '语速：' + options.rate + '×',
    '分 ' + chunks.length + ' 段朗读',
    '估算时长：约 ' + seconds.toFixed(1) + ' 秒',
    voiceName === '' ? '' : '使用语音：' + voiceName,
  ]
    .filter((line) => line !== '')
    .join('\n')
}

import { countText } from '../../lib/text'
import type { WordCountInput, WordCountOptions } from './schema'

/** 统计并输出一份多行报告；输入为空时返回空串，由 UI 显示占位文案 */
export function transform(input: WordCountInput, options: WordCountOptions): string {
  if (input.text.trim() === '') return ''
  const counts = countText(input.text)
  const chars = options.countSpaces ? counts.chars : counts.charsNoSpace
  const minutes = counts.cjk / 300 + counts.latinWords / 200

  return [
    '字符数：' + chars + (options.countSpaces ? '（含空格）' : '（不含空格）'),
    '词数：' + counts.words + '（中文 ' + counts.cjk + ' 字 + 英文 ' + counts.latinWords + ' 词）',
    '句数：' + counts.sentences,
    '段数：' + counts.paragraphs,
    '行数：' + counts.lines,
    '字节数（UTF-8）：' + counts.bytes,
    '阅读时间：' + formatMinutes(minutes),
  ].join('\n')
}

/** 不足 1 分钟改用秒表示，避免显示「约 0 分钟」 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0 秒'
  if (minutes < 1) return Math.round(minutes * 60) + ' 秒'
  return '约 ' + Math.round(minutes) + ' 分钟'
}

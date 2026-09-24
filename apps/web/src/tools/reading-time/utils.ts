import { countText, readingMinutes } from '../../lib/text'
import type { ReadingTimeInput, ReadingTimeOptions } from './schema'

/** 朗读速度按每分钟 250 字估算，与阅读速度区分开 */
const SPEAK_SPEED = 250

export function transform(input: ReadingTimeInput, options: ReadingTimeOptions): string {
  if (input.text.trim() === '') return ''
  const counts = countText(input.text)
  const speed = Number(options.speed)
  const minutes = readingMinutes(input.text, speed)

  return [
    '字数：' +
      counts.words +
      ' 词（中文 ' +
      counts.cjk +
      ' 字 + 英文 ' +
      counts.latinWords +
      ' 词）',
    '字符数：' + counts.chars,
    '阅读速度：' + speed + ' 字/分钟',
    '阅读：' + formatDuration(minutes),
    '朗读：' + formatDuration(counts.words / SPEAK_SPEED),
  ].join('\n')
}

/** 不足 1 分钟改用秒表示 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 秒'
  if (minutes < 1) return Math.max(1, Math.round(minutes * 60)) + ' 秒'
  return '约 ' + Math.round(minutes) + ' 分钟'
}

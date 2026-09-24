import { pinyin } from 'pinyin-pro'
import type { PinyinToolInput, PinyinToolOptions } from './schema'

/** 逐行转换：拼音库按词组解析，因此按行喂入可保留换行结构 */
export function convert(text: string, tone: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => {
      if (line.trim() === '') return ''
      const arr = pinyin(line, {
        type: 'array',
        toneType: tone === 'num' ? 'num' : tone === 'none' ? 'none' : 'symbol',
      })
      return arr.join(' ')
    })
    .join('\n')
}

export function transform(input: PinyinToolInput, options: PinyinToolOptions): string {
  if (input.text.trim() === '') return ''
  return convert(input.text, options.tone)
}

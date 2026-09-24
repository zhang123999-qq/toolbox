import { pinyin } from 'pinyin-pro'
import type { SlugInput, SlugOptions } from './schema'

/** 汉字与中文标点所在区段，用于判断要不要走拼音 */
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/**
 * 中文转拼音：nonZh 用 consecutive，把非中文原样留在结果里，
 * 这样中英混排的标题不会被切成两段。
 */
export function toPinyin(text: string): string {
  return pinyin(text, { toneType: 'none', nonZh: 'consecutive' })
}

/** 去掉变音符号：NFKD 分解后再剔除组合音标 */
function stripDiacritics(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

/** 标题 → slug。中文默认转拼音，也可保留原字或直接丢弃 */
export function transform(input: SlugInput, options: SlugOptions): string {
  const separator = options.separator === 'underscore' ? '_' : '-'
  let text = input.text

  if (options.chinese === 'pinyin' && HAN.test(text)) {
    text = toPinyin(text)
  } else if (options.chinese === 'drop') {
    text = text.replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, ' ')
  }

  if (options.lowercase) text = text.toLowerCase()
  text = stripDiacritics(text)

  // 保留：字母、数字，以及 chinese=keep 时留下的汉字；不转小写时大写字母也要留下
  const han = options.chinese === 'keep' ? '\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff' : ''
  const letters = options.lowercase ? 'a-z' : 'A-Za-z'
  const allowed = new RegExp('[^' + letters + '0-9' + han + ']+', 'g')
  return text
    .replace(allowed, separator)
    .replace(new RegExp(separator === '-' ? '\\-+' : '_+', 'g'), separator)
    .replace(new RegExp('^' + separator + '|' + separator + '$', 'g'), '')
}

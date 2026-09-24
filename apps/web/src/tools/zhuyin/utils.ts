import { pinyin } from 'pinyin-pro'
import type { ZhuyinInput, ZhuyinOptions } from './schema'

/** 声母 → 注音符号 */
const INITIALS: Record<string, string> = {
  b: 'ㄅ',
  p: 'ㄆ',
  m: 'ㄇ',
  f: 'ㄈ',
  d: 'ㄉ',
  t: 'ㄊ',
  n: 'ㄋ',
  l: 'ㄌ',
  g: 'ㄍ',
  k: 'ㄎ',
  h: 'ㄏ',
  j: 'ㄐ',
  q: 'ㄑ',
  x: 'ㄒ',
  zh: 'ㄓ',
  ch: 'ㄔ',
  sh: 'ㄕ',
  r: 'ㄖ',
  z: 'ㄗ',
  c: 'ㄘ',
  s: 'ㄙ',
  y: 'ㄧ',
  w: 'ㄨ',
}

/** 韵母 → 注音符号（含 ü 的 v / ü 两种写法） */
const FINALS: Record<string, string> = {
  a: 'ㄚ',
  o: 'ㄛ',
  e: 'ㄜ',
  i: 'ㄧ',
  u: 'ㄨ',
  v: 'ㄩ',
  ü: 'ㄩ',
  ai: 'ㄞ',
  ei: 'ㄟ',
  ao: 'ㄠ',
  ou: 'ㄡ',
  an: 'ㄢ',
  en: 'ㄣ',
  ang: 'ㄤ',
  eng: 'ㄥ',
  ong: 'ㄨㄥ',
  er: 'ㄦ',
  ia: 'ㄧㄚ',
  iao: 'ㄧㄠ',
  ie: 'ㄧㄝ',
  iu: 'ㄧㄡ',
  ian: 'ㄧㄢ',
  in: 'ㄧㄣ',
  iang: 'ㄧㄤ',
  ing: 'ㄧㄥ',
  iong: 'ㄩㄥ',
  ua: 'ㄨㄚ',
  uo: 'ㄨㄛ',
  uai: 'ㄨㄞ',
  ui: 'ㄨㄟ',
  uan: 'ㄨㄢ',
  un: 'ㄨㄣ',
  uang: 'ㄨㄤ',
  ueng: 'ㄨㄥ',
  van: 'ㄩㄢ',
  ve: 'ㄩㄝ',
  vn: 'ㄩㄣ',
  üan: 'ㄩㄢ',
  üe: 'ㄩㄝ',
  ün: 'ㄩㄣ',
}

/** 声调符号：一声不标，二三四声标在末尾，轻声标 ˙ */
const TONE_MARKS = ['', '', 'ˊ', 'ˇ', 'ˋ', '˙']

/** 舌尖元音：这些声母后的 i 不发音（空韵） */
const EMPTY_RHYME = new Set(['zh', 'ch', 'sh', 'r', 'z', 'c', 's'])

/** 拆出声母、韵母与声调；解析不了时返回原音节 */
export function splitSyllable(syllable: string): { initial: string; final: string; tone: number } {
  let body = syllable
  let tone = 0
  const tail = body.match(/[1-5]$/)
  if (tail) {
    tone = Number(tail[0])
    body = body.slice(0, -1)
  }
  for (const len of [2, 1]) {
    const head = body.slice(0, len)
    if (head.length === len && INITIALS[head]) {
      let rest = body.slice(len)
      // j / q / x 后的 u 实际是 ü
      if ((head === 'j' || head === 'q' || head === 'x') && rest.startsWith('u')) {
        rest = 'v' + rest.slice(1)
      }
      // 翘舌与平舌后的 i 是空韵，不写符号
      if (EMPTY_RHYME.has(head) && rest === 'i') rest = ''
      return { initial: head, final: rest, tone }
    }
  }
  return { initial: '', final: body, tone }
}

/** 单个音节（如 gong1）转注音（如 ㄍㄨㄥ） */
export function syllableToZhuyin(syllable: string, withTone: boolean): string {
  const { initial, final, tone } = splitSyllable(syllable)
  const initialMark = INITIALS[initial] ?? ''
  const finalMark = FINALS[final] ?? (final === '' ? '' : final)
  if (initialMark === '' && finalMark === final) return syllable
  return initialMark + finalMark + (withTone ? (TONE_MARKS[tone] ?? '') : '')
}

export function convert(text: string, tone: string): string {
  const withTone = tone !== 'none'
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => {
      if (line.trim() === '') return ''
      const arr = pinyin(line, { type: 'array', toneType: 'num' })
      return arr.map((py) => syllableToZhuyin(py, withTone)).join(' ')
    })
    .join('\n')
}

export function transform(input: ZhuyinInput, options: ZhuyinOptions): string {
  if (input.text.trim() === '') return ''
  return convert(input.text, options.tone)
}

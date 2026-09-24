/**
 * 文本统计与分词的共用实现。
 *
 * 文本域多个工具（字数统计 / 中英文字数 / 阅读时间 / 可读性 / 词频 / 关键词密度…）
 * 都要用到同一套计数口径。按 DEVELOPMENT.md §8.4「工具之间禁止互相 import，
 * 共用逻辑一律上提到 lib」，这里只放与 UI 无关的纯函数。
 */

/** CJK 表意文字（含扩展 A）与日文假名 */
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/

/** 拉丁单词：字母串，允许内部撇号与连字符 */
const LATIN = /[A-Za-z\u00c0-\u024f]+(?:['’-][A-Za-z\u00c0-\u024f]+)*/g

/** 一个「词」：拉丁单词，或连续的汉字块（未做中文分词） */
const WORD =
  /[A-Za-z\u00c0-\u024f]+(?:['’-][A-Za-z\u00c0-\u024f]+)*|[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g

/** 句末标点（中英文） */
const SENTENCE_END = /[.!?。！？；;]/g

export interface TextCounts {
  /** 字符数（按 Unicode 码点计，含空白） */
  chars: number
  /** 字符数（不含空白） */
  charsNoSpace: number
  /** 中日韩字符数 */
  cjk: number
  /** 拉丁单词数 */
  latinWords: number
  /** 词数 = 中日韩字符数 + 拉丁单词数 */
  words: number
  /** 句数：无句末标点但有内容时记为 1 */
  sentences: number
  /** 段数：按空行分隔的非空块 */
  paragraphs: number
  /** 行数 */
  lines: number
  /** UTF-8 字节数 */
  bytes: number
}

/** UTF-8 字节数 —— 浏览器与 Node 都提供 TextEncoder */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/** 是否中日韩字符 */
export function isCjk(ch: string): boolean {
  return CJK.test(ch)
}

/** 统计一段文本的各类计数；空串一律得 0，调用方不必再判空 */
export function countText(text: string): TextCounts {
  const codePoints = [...text]
  const charsNoSpace = codePoints.filter((ch) => !/\s/.test(ch)).length
  const cjk = codePoints.filter((ch) => CJK.test(ch)).length
  const latinWords = (text.match(LATIN) ?? []).length
  const trimmed = text.trim()
  const sentences = trimmed ? Math.max(1, (text.match(SENTENCE_END) ?? []).length) : 0
  const paragraphs = trimmed
    ? text.split(/\r\n\s*\r\n|\n\s*\n/).filter((part) => part.trim() !== '').length
    : 0
  const lines = text === '' ? 0 : text.split(/\r\n|\r|\n/).length

  return {
    chars: codePoints.length,
    charsNoSpace,
    cjk,
    latinWords,
    words: cjk + latinWords,
    sentences,
    paragraphs,
    lines,
    bytes: byteLength(text),
  }
}

/** 切出词序列：拉丁单词 + 连续汉字块。中文未做分词，按边界切块 */
export function splitWords(text: string): string[] {
  return text.match(WORD) ?? []
}

/** 估算阅读时长（分钟）：英文单词按 1.5 字折算，与中文速度同一把尺子 */
export function readingMinutes(text: string, speed: number): number {
  const counts = countText(text)
  const units = counts.cjk + counts.latinWords * 1.5
  return units / Math.max(1, speed)
}

/** 常用停用词（中英），词频 / 关键词密度默认过滤 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  // 中文
  '的',
  '了',
  '和',
  '是',
  '在',
  '我',
  '有',
  '就',
  '不',
  '人',
  '都',
  '一',
  '一个',
  '上',
  '也',
  '很',
  '到',
  '说',
  '要',
  '去',
  '你',
  '会',
  '着',
  '没有',
  '看',
  '好',
  '自己',
  '这',
  '那',
  '他',
  '她',
  '它',
  '们',
  '吗',
  '呢',
  '吧',
  '啊',
  '与',
  '及',
  '或',
  '但',
  '而',
  '因',
  '所以',
  '如果',
  '可以',
  '这个',
  '那个',
  '什么',
  '怎么',
  '为什么',
  '我们',
  '你们',
  '他们',
  // 英文
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'if',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'am',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'as',
  'by',
  'from',
  'that',
  'this',
  'these',
  'those',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'not',
  'no',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'may',
  'might',
  'must',
  'about',
  'into',
  'over',
  'than',
  'then',
  'so',
  'such',
])

/** 是否停用词（大小写不敏感） */
export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase())
}

/** 估算英文单词的音节数：元音组计数，静音 e 不计，最少 1 */
export function syllableCount(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!cleaned) return 1
  const groups = cleaned.match(/[aeiouy]+/g) ?? []
  let count = groups.length
  if (count > 1 && cleaned.endsWith('e') && !/[aeiouy]e$/.test(cleaned)) count -= 1
  return Math.max(1, count)
}

/**
 * keyword-extract —— 关键词提取的纯函数层
 *
 * 纯 JS 的 TF 关键词提取：分词 → 去停用词 → 词频统计 → 按得分排序取 TopN。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 中文停用词（常见虚词） */
export const STOPWORDS_ZH: ReadonlySet<string> = new Set([
  '的',
  '了',
  '在',
  '是',
  '我',
  '有',
  '和',
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
  '这个',
  '那个',
  '与',
  '及',
  '或',
  '但',
  '而',
  '因为',
  '所以',
  '如果',
  '我们',
  '你们',
  '他们',
  '它',
  '其',
  '之',
  '于',
  '被',
  '把',
  '对',
  '将',
  '从',
  '向',
  '等',
  '可以',
  '能够',
  '进行',
  '通过',
  '作为',
  '以及',
])

/** 英文停用词（常见虚词） */
export const STOPWORDS_EN: ReadonlySet<string> = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'as',
  'by',
  'at',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'my',
  'your',
  'his',
  'her',
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
  'if',
  'then',
  'than',
  'so',
  'such',
  'only',
  'also',
  'into',
  'over',
  'after',
  'before',
])

/** 文本上限字符数 */
export const MAX_TEXT_CHARS = 50_000

/** TopN 上限 */
export const MAX_TOP_N = 100

/** 默认 TopN */
export const DEFAULT_TOP_N = 20

/** 单条关键词结果 */
export interface KeywordResult {
  readonly word: string
  readonly count: number
  /** 词频占比 0~1，保留 4 位小数 */
  readonly score: number
}

const EN_WORD_RE = /[A-Za-z][A-Za-z0-9]*/g
const CJK_SEQ_RE = /[㐀-䶿一-鿿豈-﫿]{2,}/g

/** 是否为停用词 */
export function isStopWord(token: string): boolean {
  return STOPWORDS_ZH.has(token) || STOPWORDS_EN.has(token)
}

/**
 * 分词：英文单词转小写；中文连续序列整体保留，并追加二元滑动窗口，
 * 以兼容无空格的中文文本。
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const m of text.matchAll(EN_WORD_RE)) {
    tokens.push(m[0].toLowerCase())
  }
  for (const m of text.matchAll(CJK_SEQ_RE)) {
    const seq = m[0]
    tokens.push(seq)
    for (let i = 0; i + 2 <= seq.length; i++) {
      const gram = seq.slice(i, i + 2)
      if (gram !== seq) tokens.push(gram)
    }
  }
  return tokens
}

/** 校验并归一化 TopN：必须为 1~100 的整数（接受字符串或数字） */
export function validateTopN(value: unknown): number {
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value)
  if (!Number.isInteger(n) || n < 1 || n > MAX_TOP_N) {
    throw new Error(`TopN 必须是 1~${MAX_TOP_N} 的整数`)
  }
  return n
}

/** 得分保留 4 位小数 */
function round4(x: number): number {
  return Math.round(x * 10000) / 10000
}

/**
 * 提取关键词：分词 → 去停用词 → TF 计分 → 按词频降序
 * （词频相同按首次出现顺序）取 TopN。
 * 空文本 / 超长 / 全停用词抛中文错。
 */
export function extractKeywords(text: string, topN: number = DEFAULT_TOP_N): KeywordResult[] {
  const clean = text.trim()
  if (clean === '') throw new Error('文本不能为空')
  if (clean.length > MAX_TEXT_CHARS) {
    throw new Error(`文本过长：${clean.length} 字符，超过 ${MAX_TEXT_CHARS} 上限`)
  }
  const tokens = tokenize(clean).filter((t) => !isStopWord(t))
  if (tokens.length === 0) {
    throw new Error('文本经停用词过滤后无有效词汇，请输入包含实词的文本')
  }
  const freq = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  tokens.forEach((t, i) => {
    freq.set(t, (freq.get(t) ?? 0) + 1)
    if (!firstSeen.has(t)) firstSeen.set(t, i)
  })
  const total = tokens.length
  return [...freq.entries()]
    .sort(
      (a, b) => b[1] - a[1] || (firstSeen.get(a[0]) as number) - (firstSeen.get(b[0]) as number),
    )
    .slice(0, topN)
    .map(([word, count]) => ({ word, count, score: round4(count / total) }))
}

/** 结果格式化为可复制的多行文本：`词 ×次数（占比%）` */
export function formatKeywords(results: readonly KeywordResult[]): string {
  return results.map((r) => `${r.word} ×${r.count}（${(r.score * 100).toFixed(2)}%）`).join('\n')
}

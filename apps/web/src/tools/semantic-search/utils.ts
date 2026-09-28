/**
 * semantic-search —— 语义搜索（纯 JS TF-IDF）的纯函数层
 *
 * 原理：词袋模型 + TF-IDF 加权 + 余弦相似度。
 * - 英文 / 数字按词切分（小写）；中文按「单字 + 二元词」切分
 *   （无词典分词，详见 README「原理与局限」）；
 * - idf 采用平滑公式 ln((N+1)/(df+1)) + 1，避免除零；
 * - 查询与每篇文档计算余弦相似度，按得分降序排列。
 *
 * 本文件不触碰浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 是否为 CJK 字符（中日韩统一表意文字及扩展） */
function isCjk(char: string): boolean {
  // char 来自 [...text] 切分，恒为非空单字符，codePointAt(0) 不会返回 undefined
  const code = char.codePointAt(0)!
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  )
}

/**
 * 分词：英文 / 数字词（小写）+ CJK 单字与二元词。
 * 标点与空白被丢弃；空字符串返回空数组。
 *
 * 例：'Hello 世界！' → ['hello', '世', '界', '世界']
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  const lower = text.toLowerCase()
  const wordRe = /[a-z0-9]+/g
  let m: RegExpExecArray | null
  while ((m = wordRe.exec(lower)) !== null) tokens.push(m[0])
  const chars = [...text]
  const cjkChars = chars.filter((c) => isCjk(c))
  for (const c of cjkChars) tokens.push(c)
  for (let i = 0; i + 1 < cjkChars.length; i++) tokens.push(cjkChars[i]! + cjkChars[i + 1]!)
  return tokens
}

/** 词频统计：token → 出现次数 */
export function termFreq(tokens: readonly string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
  return freq
}

/**
 * 计算逆文档频率：idf(t) = ln((N+1)/(df+1)) + 1。
 * docsTokens 为每篇文档的分词结果；空文档库返回空 Map。
 */
export function buildIdf(docsTokens: readonly (readonly string[])[]): Map<string, number> {
  const idf = new Map<string, number>()
  const n = docsTokens.length
  if (n === 0) return idf
  const df = new Map<string, number>()
  for (const tokens of docsTokens) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  }
  for (const [t, d] of df) idf.set(t, Math.log((n + 1) / (d + 1)) + 1)
  return idf
}

/** TF-IDF 向量：token → tf * idf（idf 缺失的词权重为 0，即被忽略） */
export function tfidfVector(
  tokens: readonly string[],
  idf: ReadonlyMap<string, number>,
): Map<string, number> {
  const vec = new Map<string, number>()
  const tf = termFreq(tokens)
  for (const [t, f] of tf) {
    const w = idf.get(t)
    // 平滑 idf 恒 ≥ 1，不会出现 0 权重；查询词不在文档库时 w 为 undefined，直接忽略
    if (w !== undefined) vec.set(t, f * w)
  }
  return vec
}

/** 余弦相似度；任一向量为空（零向量）时返回 0 */
export function cosineSimilarity(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const v of a.values()) normA += v * v
  for (const v of b.values()) normB += v * v
  if (normA === 0 || normB === 0) return 0
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]
  for (const [t, v] of smaller) {
    const u = larger.get(t)
    if (u !== undefined) dot += v * u
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** 按行切分文档库：空行分隔或逐行，去除空行；全空返回空数组 */
export function splitDocuments(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/** 排序后的文档 */
export interface RankedDoc {
  /** 原文档下标 */
  readonly index: number
  /** 文档内容 */
  readonly text: string
  /** 余弦相似度得分（0～1） */
  readonly score: number
}

/**
 * 对文档库做 TF-IDF 排序：返回按得分降序的文档列表。
 * 文档库为空 / 查询为空（去空白后）抛中文错。
 */
export function rankDocuments(docs: readonly string[], query: string): RankedDoc[] {
  if (docs.length === 0) throw new Error('文档库为空：请先添加文档')
  if (query.trim() === '') throw new Error('请输入查询语句')
  const docsTokens = docs.map((d) => tokenize(d))
  const idf = buildIdf(docsTokens)
  const queryVec = tfidfVector(tokenize(query), idf)
  const ranked = docs.map((text, index) => ({
    index,
    text,
    score: cosineSimilarity(queryVec, tfidfVector(docsTokens[index]!, idf)),
  }))
  ranked.sort((x, y) => y.score - x.score)
  return ranked
}

/** 得分 → 保留 4 位小数的字符串 */
export function formatScore(score: number): string {
  if (!Number.isFinite(score)) throw new Error(`得分非法：${String(score)}`)
  return score.toFixed(4)
}

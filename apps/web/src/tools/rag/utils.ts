/**
 * rag —— RAG 问答（纯 JS）的纯函数层
 *
 * 原理：检索增强生成（无 LLM 的抽取式版本）。
 * 1. 切分：将文档按字符滑窗切成片段（chunk）；
 * 2. 检索：TF-IDF + 余弦相似度取 top-k 相关片段；
 * 3. 作答：从相关片段中抽取包含查询关键词的句子拼接成答案（抽取式，非生成式）。
 *
 * 局限见 README：词袋模型、无语义理解、答案只是原文句子的拼接。
 * 本文件不触碰浏览器 API，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 文本切分
// ---------------------------------------------------------------------------

/**
 * 按字符滑窗切分：每块 chunkSize 字符，相邻块重叠 overlap 字符。
 * chunkSize 须为正整数；overlap 须满足 0 <= overlap < chunkSize。
 * 空文本返回空数组。
 */
export function chunkText(text: string, chunkSize = 300, overlap = 50): string[] {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(`分块大小非法：${String(chunkSize)}（应为正整数）`)
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error(`重叠长度非法：${String(overlap)}（应为 0～${chunkSize - 1} 的整数）`)
  }
  if (text === '') return []
  const chunks: string[] = []
  const step = chunkSize - overlap
  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + chunkSize))
  }
  return chunks
}

/** 按句切分：。！？!?；; 与换行都是句子边界；空文本返回空数组 */
export function splitSentences(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ---------------------------------------------------------------------------
// 轻量 TF-IDF（本工具自包含，不依赖其他工具）
// ---------------------------------------------------------------------------

/** 是否为 CJK 字符 */
function isCjk(char: string): boolean {
  const code = char.codePointAt(0)!
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  )
}

/** 分词：英文 / 数字词（小写）+ CJK 单字与二元词 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  const wordRe = /[a-z0-9]+/g
  let m: RegExpExecArray | null
  const lower = text.toLowerCase()
  while ((m = wordRe.exec(lower)) !== null) tokens.push(m[0])
  const cjkChars = [...text].filter((c) => isCjk(c))
  for (const c of cjkChars) tokens.push(c)
  for (let i = 0; i + 1 < cjkChars.length; i++) tokens.push(cjkChars[i]! + cjkChars[i + 1]!)
  return tokens
}

/** 逆文档频率（平滑）：idf(t) = ln((N+1)/(df+1)) + 1；调用方保证文档数 ≥ 1 */
function buildIdf(docsTokens: readonly (readonly string[])[]): Map<string, number> {
  const idf = new Map<string, number>()
  const n = docsTokens.length
  const df = new Map<string, number>()
  for (const tokens of docsTokens) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  }
  for (const [t, d] of df) idf.set(t, Math.log((n + 1) / (d + 1)) + 1)
  return idf
}

/** 余弦相似度；零向量返回 0 */
function cosineSimilarity(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const v of a.values()) normA += v * v
  for (const v of b.values()) normB += v * v
  if (normA === 0 || normB === 0) return 0
  for (const [t, v] of a) {
    const u = b.get(t)
    if (u !== undefined) dot += v * u
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** TF-IDF 向量 */
function tfidfVector(
  tokens: readonly string[],
  idf: ReadonlyMap<string, number>,
): Map<string, number> {
  const vec = new Map<string, number>()
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  for (const [t, f] of tf) {
    const w = idf.get(t)
    if (w !== undefined) vec.set(t, f * w)
  }
  return vec
}

// ---------------------------------------------------------------------------
// 检索与抽取式作答
// ---------------------------------------------------------------------------

/** 检索到的片段 */
export interface RetrievedChunk {
  /** 片段在切分结果中的下标 */
  readonly index: number
  readonly text: string
  /** 余弦相似度得分 */
  readonly score: number
}

/**
 * 检索 top-k 相关片段（按得分降序）。
 * 片段为空返回空数组；查询为空 / k 非正整数抛中文错。
 */
export function retrieveTopK(
  chunks: readonly string[],
  query: string,
  k: number = 3,
): RetrievedChunk[] {
  if (chunks.length === 0) return []
  if (query.trim() === '') throw new Error('请输入问题')
  if (!Number.isInteger(k) || k <= 0) throw new Error(`数量 k 非法：${String(k)}（应为正整数）`)
  const chunksTokens = chunks.map((c) => tokenize(c))
  const idf = buildIdf(chunksTokens)
  const queryVec = tfidfVector(tokenize(query), idf)
  const scored = chunks.map((text, index) => ({
    index,
    text,
    score: cosineSimilarity(queryVec, tfidfVector(chunksTokens[index]!, idf)),
  }))
  scored.sort((x, y) => y.score - x.score)
  return scored.slice(0, k)
}

/** 未找到相关内容时的作答 */
export const NO_ANSWER = '在文档中未找到与问题相关的内容，请换个问法或补充文档。'

/**
 * 抽取式作答：从检索片段中挑出包含查询关键词的句子（去重，最多 maxSentences 句）。
 * maxSentences 须为正整数；无匹配句子时返回 NO_ANSWER。
 */
export function extractAnswer(
  chunks: readonly RetrievedChunk[],
  query: string,
  maxSentences: number = 3,
): string {
  if (!Number.isInteger(maxSentences) || maxSentences <= 0) {
    throw new Error(`句子数非法：${String(maxSentences)}（应为正整数）`)
  }
  if (chunks.length === 0) return NO_ANSWER
  const keywords = tokenize(query).filter((t) => t.length > 0)
  const seen = new Set<string>()
  const picked: string[] = []
  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      if (picked.length >= maxSentences) break
      if (seen.has(sentence)) continue
      if (keywords.some((kw) => sentence.toLowerCase().includes(kw.toLowerCase()))) {
        seen.add(sentence)
        picked.push(sentence)
      }
    }
    if (picked.length >= maxSentences) break
  }
  if (picked.length === 0) return NO_ANSWER
  return picked.join('\n')
}

/** RAG 作答结果 */
export interface RagResult {
  readonly chunks: readonly RetrievedChunk[]
  readonly answer: string
}

/**
 * 一站式问答：切分 → 检索 top-k → 抽取作答。
 * 文档为空抛中文错；查询为空由 retrieveTopK 抛中文错。
 */
export function answerQuestion(corpus: string, query: string, k: number = 3): RagResult {
  if (corpus.trim() === '') throw new Error('请先输入文档内容')
  const chunks = chunkText(corpus)
  const top = retrieveTopK(chunks, query, k)
  return { chunks: top, answer: extractAnswer(top, query) }
}

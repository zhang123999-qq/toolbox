/**
 * local-qa —— 本地抽取式问答的纯函数层
 *
 * 原理：文档按空行切分为多篇 → 按中英文句末标点切句 → 分词（英文小写切词 / 中文单字）→
 * 以「句」为单位计算 TF-IDF → 问题向量与句向量做余弦相似度 → 取 topK 句拼成回答。
 *
 * 局限：这是关键词匹配的抽取式问答，**不是语义理解**——同义词、指代、推理题答不好；
 * 回答只是原文句子的拼接，不会组织成自然语言；无相关句时明确告知找不到。
 */

/** 文档上限篇数 */
export const MAX_DOCS = 50
/** 单篇文档上限字符数 */
export const MAX_DOC_CHARS = 50_000
/** 单句上限字符数（超长句截断，避免分词爆炸） */
export const MAX_SENTENCE_CHARS = 2_000
/** 问题上限字符数 */
export const MAX_QUESTION_CHARS = 2_000

/** 切分后的一句 */
export interface Sentence {
  readonly docIndex: number
  readonly text: string
  readonly tokens: readonly string[]
}

/** 一条证据 */
export interface Evidence {
  readonly docIndex: number
  readonly sentence: string
  readonly score: number
}

/** 问答结果 */
export interface QaResult {
  readonly answer: string
  readonly evidence: readonly Evidence[]
  readonly found: boolean
}

/** 分词：英文/数字切词小写，CJK 单字 */
export function tokenize(text: string): string[] {
  if (typeof text !== 'string') throw new Error('内容必须是文本')
  const tokens: string[] = []
  const wordRe = /[a-z0-9]+|[\u4e00-\u9fff]/g
  let m: RegExpExecArray | null
  const lower = text.toLowerCase()
  while ((m = wordRe.exec(lower)) !== null) tokens.push(m[0])
  return tokens
}

/** 按空行切分多篇文档；空篇丢弃 */
export function splitDocs(text: string): string[] {
  if (typeof text !== 'string') throw new Error('文档内容必须是文本')
  const docs = text
    .split(/\n\s*\n/)
    .map((d) => d.trim())
    .filter((d) => d !== '')
  if (docs.length === 0) throw new Error('请先粘贴文档：没有检测到有效内容')
  if (docs.length > MAX_DOCS) throw new Error(`文档过多：${docs.length} 篇，超过 ${MAX_DOCS} 上限`)
  for (const d of docs) {
    if (d.length > MAX_DOC_CHARS) throw new Error(`单篇文档过长：超过 ${MAX_DOC_CHARS} 字符`)
  }
  return docs
}

/** 按句末标点切句；超长句截断；空句丢弃 */
export function splitSentences(doc: string, docIndex: number): Sentence[] {
  const out: Sentence[] = []
  const parts = doc.split(/(?<=[。！？!?；;])\s*|\n+/)
  for (const part of parts) {
    const text = part.trim()
    if (text === '') continue
    const cut = text.length > MAX_SENTENCE_CHARS ? text.slice(0, MAX_SENTENCE_CHARS) : text
    const tokens = tokenize(cut)
    if (tokens.length === 0) continue
    out.push({ docIndex, text: cut, tokens })
  }
  return out
}

/** 建索引：全部句子 + 每个词的文档频率（以句为单位） */
export function buildIndex(docs: readonly string[]): {
  sentences: Sentence[]
  docFreq: Map<string, number>
} {
  const sentences: Sentence[] = []
  docs.forEach((doc, i) => sentences.push(...splitSentences(doc, i)))
  const docFreq = new Map<string, number>()
  for (const s of sentences) {
    for (const t of new Set(s.tokens)) docFreq.set(t, (docFreq.get(t) ?? 0) + 1)
  }
  return { sentences, docFreq }
}

/** idf：log((N+1)/(df+1)) + 1，平滑处理 */
export function idf(df: number, total: number): number {
  if (!Number.isInteger(df) || df < 0) throw new Error('词频非法')
  if (!Number.isInteger(total) || total <= 0) throw new Error('句子总数非法')
  return Math.log((total + 1) / (df + 1)) + 1
}

/** 句子的 TF-IDF 向量（Map 词 → 权重） */
export function tfidfVector(
  tokens: readonly string[],
  docFreq: ReadonlyMap<string, number>,
  total: number,
): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  const vec = new Map<string, number>()
  const len = tokens.length
  for (const [t, c] of tf) {
    vec.set(t, (c / len) * idf(docFreq.get(t) ?? 0, total))
  }
  return vec
}

/** 稀疏向量余弦相似度 */
export function cosineSparse(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const [t, x] of a) {
    na += x * x
    const y = b.get(t)
    if (y !== undefined) dot += x * y
  }
  for (const y of b.values()) nb += y * y
  if (na === 0 || nb === 0) return 0
  return dot / Math.sqrt(na * nb)
}

/**
 * 抽取式问答：返回 topK 相关句拼成的回答与证据列表。
 * 问题为空 / 无文档 / 无相关句时给出中文说明（found=false）。
 */
export function answerQuestion(docsText: string, question: string, topK: number): QaResult {
  const q = question.trim()
  if (q === '') throw new Error('问题不能为空')
  if (q.length > MAX_QUESTION_CHARS) {
    throw new Error(`问题过长：超过 ${MAX_QUESTION_CHARS} 字符`)
  }
  if (!Number.isInteger(topK) || topK < 1 || topK > 10) {
    throw new Error('证据句数非法：应为 1～10 的整数')
  }
  const docs = splitDocs(docsText)
  const { sentences, docFreq } = buildIndex(docs)
  if (sentences.length === 0) throw new Error('文档中没有可检索的句子')
  const qTokens = tokenize(q)
  if (qTokens.length === 0) throw new Error('问题中没有可检索的词语')
  const qVec = tfidfVector(qTokens, docFreq, sentences.length)
  const scored = sentences.map((s) => ({
    sentence: s,
    score: cosineSparse(tfidfVector(s.tokens, docFreq, sentences.length), qVec),
  }))
  scored.sort((a, b) => b.score - a.score)
  const hits = scored.filter((s) => s.score > 0).slice(0, topK)
  if (hits.length === 0) {
    return {
      answer: '未在文档中找到与问题相关的内容，请换个问法或补充文档。',
      evidence: [],
      found: false,
    }
  }
  const evidence: Evidence[] = hits.map((h) => ({
    docIndex: h.sentence.docIndex,
    sentence: h.sentence.text,
    score: h.score,
  }))
  return { answer: hits.map((h) => h.sentence.text).join('\n'), evidence, found: true }
}

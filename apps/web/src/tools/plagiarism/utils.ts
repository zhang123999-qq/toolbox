/**
 * plagiarism —— 抄袭检测的纯函数层
 *
 * 诚实实现：只做用户粘贴的多篇文档之间的两两相似度比对
 * （字符级 shingle n-gram + Jaccard），不声称"全网查重"。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** shingle n-gram 长度（字符） */
export const SHINGLE_N = 5

/** 文档下限字符数：太短无法比对 */
export const MIN_DOC_CHARS = 20

/** 文档上限字符数 */
export const MAX_DOC_CHARS = 200_000

/** 参与片段标出的句子下限字符数：过滤过短噪音 */
export const MIN_SENTENCE_CHARS = 10

/** 阈值候选项（字符串形式，供下拉框） */
export const THRESHOLDS = ['0.2', '0.3', '0.4', '0.5', '0.6'] as const
export const DEFAULT_THRESHOLD = '0.3'

/** 输入文档 */
export interface DocInput {
  readonly name: string
  readonly text: string
}

/** 文档对评分 */
export interface PairScore {
  readonly a: string
  readonly b: string
  readonly score: number
}

/** 高度相似的句子 */
export interface SimilarSentence {
  readonly sentence: string
  readonly score: number
}

/** 文档对比对明细 */
export interface PairDetail extends PairScore {
  readonly similar: readonly SimilarSentence[]
}

/** 规范化：去空白与标点，拉丁部分转小写（中英文通用） */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}]/gu, '')
}

/** 字符级 n-gram shingle 集合 */
export function shingles(text: string, n: number): Set<string> {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`n-gram 长度非法：${String(n)}`)
  const norm = normalize(text)
  const set = new Set<string>()
  for (let i = 0; i + n <= norm.length; i++) set.add(norm.slice(i, i + n))
  return set
}

/** Jaccard 相似度；任一集合为空时为 0 */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/** 两篇文档的整体相似度 */
export function docSimilarity(a: string, b: string, n: number = SHINGLE_N): number {
  return jaccard(shingles(a, n), shingles(b, n))
}

/** 按句切分并过滤过短片段 */
export function splitSentences(text: string): string[] {
  return text
    .split(/[。！？!?；;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_SENTENCE_CHARS)
}

/** 解析阈值字符串；非法抛中文错 */
export function parseThreshold(raw: string): number {
  const t = Number(raw)
  if (!Number.isFinite(t) || t <= 0 || t > 1) throw new Error(`相似度阈值非法：${raw}`)
  return t
}

/** 校验单篇文档 */
export function validateDoc(name: string, text: string): string {
  const t = text.trim()
  if (t === '') throw new Error(`${name}不能为空`)
  if (t.length < MIN_DOC_CHARS) throw new Error(`${name}太短（少于 ${MIN_DOC_CHARS} 字符），无法比对`)
  if (t.length > MAX_DOC_CHARS) {
    throw new Error(`${name}过长：${t.length} 字符，超过 ${MAX_DOC_CHARS} 上限`)
  }
  return t
}

/** 找出 a 中与 b 高度相似的句子（最佳匹配分 ≥ threshold） */
export function findSimilarSentences(
  a: string,
  b: string,
  threshold: number,
  n: number = SHINGLE_N,
): SimilarSentence[] {
  const sa = splitSentences(a)
  const sbSets = splitSentences(b).map((s) => shingles(s, n))
  const out: SimilarSentence[] = []
  for (const sentence of sa) {
    const setA = shingles(sentence, n)
    let best = 0
    for (const setB of sbSets) {
      const s = jaccard(setA, setB)
      if (s > best) best = s
    }
    if (best >= threshold) out.push({ sentence, score: best })
  }
  return out.sort((x, y) => y.score - x.score)
}

/** 全部文档两两比对，按相似度降序；达到阈值的对才标出相似片段 */
export function compareAll(
  docs: DocInput[],
  threshold: number,
  n: number = SHINGLE_N,
): PairDetail[] {
  if (docs.length < 2) throw new Error('至少需要两篇文档才能比对')
  const pairs: PairDetail[] = []
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const score = docSimilarity(docs[i].text, docs[j].text, n)
      pairs.push({
        a: docs[i].name,
        b: docs[j].name,
        score,
        similar:
          score >= threshold ? findSimilarSentences(docs[i].text, docs[j].text, threshold, n) : [],
      })
    }
  }
  return pairs.sort((x, y) => y.score - x.score)
}

/** 相似度 → 中文等级 */
export function similarityLevel(score: number): string {
  if (score >= 0.6) return '高度相似'
  if (score >= 0.3) return '中度相似'
  if (score > 0) return '轻微相似'
  return '无相似'
}

/** 相似度 → 百分比文本 */
export function formatPercent(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

/** 生成可复制 / 下载的比对报告 */
export function buildReport(pairs: readonly PairDetail[]): string {
  const lines = ['## 抄袭检测', '']
  for (const p of pairs) {
    lines.push(`### ${p.a} × ${p.b}：${formatPercent(p.score)}（${similarityLevel(p.score)}）`)
    for (const s of p.similar) lines.push(`- [${formatPercent(s.score)}] ${s.sentence}`)
    lines.push('')
  }
  return lines.join('\n')
}

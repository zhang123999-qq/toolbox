/**
 * embedding —— 特征哈希（feature hashing）文本嵌入的纯函数层
 *
 * 原理：分词 → 每个词用 FNV-1a 哈希映射到 [0, dim) 的下标（带 ±1 符号）→
 * 累加 → L2 归一化。同一文本永远得到同一向量，无需模型、无需联网。
 *
 * 局限：这是词袋式哈希嵌入，**不是语义嵌入**——词序丢失、同义词不相似；
 * 不同词可能哈希碰撞到同一维度（维度越大碰撞越少）。
 */

/** 可选维度 */
export const EMBED_DIMS = [64, 128, 256, 512, 1024] as const
export type EmbedDim = (typeof EMBED_DIMS)[number]

/** 文本上限字符数 */
export const MAX_TEXT_CHARS = 100_000

/** FNV-1a 32 位哈希（无符号） */
export function fnv1a32(token: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * 分词：英文/数字按连续字母数字切词并小写；CJK 按单字切分；
 * 其他字符视作分隔符。空文本返回空数组。
 */
export function tokenize(text: string): string[] {
  if (typeof text !== 'string') throw new Error('待嵌入内容必须是文本')
  const lower = text.toLowerCase()
  const tokens: string[] = []
  const wordRe = /[a-z0-9]+|[\u4e00-\u9fff]/g
  let m: RegExpExecArray | null
  while ((m = wordRe.exec(lower)) !== null) tokens.push(m[0])
  return tokens
}

/**
 * 文本 → dim 维归一化向量（number[]）。
 * 空文本得到零向量；dim 非法抛中文错。
 */
export function embedText(text: string, dim: number): number[] {
  if (!Number.isInteger(dim) || !(EMBED_DIMS as readonly number[]).includes(dim)) {
    throw new Error(`维度非法：${String(dim)}（可选 ${EMBED_DIMS.join(' / ')}）`)
  }
  if (typeof text !== 'string') throw new Error('待嵌入内容必须是文本')
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`文本过长：${text.length} 字符，超过 ${MAX_TEXT_CHARS} 上限`)
  }
  const vec = new Array<number>(dim).fill(0)
  for (const token of tokenize(text)) {
    const h = fnv1a32(token)
    const idx = h % dim
    const sign = h & 0x80000000 ? -1 : 1
    vec[idx]! += sign
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return vec
  return vec.map((v) => v / norm)
}

/** 余弦相似度 [-1, 1]；任一零向量时返回 0；维度不一致抛中文错 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) throw new Error('向量不能为空')
  if (a.length !== b.length) throw new Error(`向量维度不一致：${a.length} vs ${b.length}`)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('向量含非法数值')
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (na === 0 || nb === 0) return 0
  const sim = dot / Math.sqrt(na * nb)
  return Math.max(-1, Math.min(1, sim))
}

/** 向量 → 展示字符串（前 n 维，保留 4 位小数） */
export function formatVector(vec: readonly number[], preview = 16): string {
  if (!Number.isInteger(preview) || preview <= 0) throw new Error('预览维度数非法')
  const head = vec.slice(0, preview).map((v) => v.toFixed(4))
  return `[${head.join(', ')}${vec.length > preview ? ', …' : ''}]（共 ${vec.length} 维）`
}

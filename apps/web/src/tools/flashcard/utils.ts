/**
 * flashcard（#830）工具函数：抽认卡与 SM-2 简化版间隔重复。
 * 纯函数，无 DOM / 网络依赖；卡片不可变更新。
 */

export interface Flashcard {
  id: string
  front: string
  back: string
  /** 简易度因子 */
  ease: number
  /** 间隔天数 */
  interval: number
  /** 连续答对次数 */
  repetitions: number
  /** 下次到期时间戳（毫秒） */
  due: number
}

const DAY_MS = 86400000

/** 新建卡片；正反面为空抛中文错误 */
export function newCard(
  front: string,
  back: string,
  now: number = Date.now(),
  id?: string,
): Flashcard {
  if (front.trim() === '' || back.trim() === '') {
    throw new Error('卡片正反面不能为空')
  }
  return {
    id: id ?? `card-${now}-${Math.floor(Math.random() * 1000000)}`,
    front: front.trim(),
    back: back.trim(),
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    due: now,
  }
}

/**
 * SM-2 简化版评分：quality 为 0–5 整数。
 * ≥3 视为答对（拉长间隔），<3 重置为 1 天；ease 下限 1.3。
 */
export function gradeCard(card: Flashcard, quality: number, now: number = Date.now()): Flashcard {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new Error('评分必须为 0–5 的整数')
  }
  let { ease, interval, repetitions } = card
  if (quality >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ease)
    repetitions += 1
  } else {
    repetitions = 0
    interval = 1
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  return { ...card, ease, interval, repetitions, due: now + interval * DAY_MS }
}

/** 筛选到期的卡片 */
export function dueCards(deck: Flashcard[], now: number = Date.now()): Flashcard[] {
  return deck.filter((c) => c.due <= now)
}

/** 牌组统计：总数 / 到期数 / 新卡数（从未答对） */
export function deckStats(
  deck: Flashcard[],
  now: number = Date.now(),
): {
  total: number
  due: number
  fresh: number
} {
  return {
    total: deck.length,
    due: dueCards(deck, now).length,
    fresh: deck.filter((c) => c.repetitions === 0).length,
  }
}

/**
 * 从 CSV 导入牌组：每行 "正面,背面"（按首个逗号切分）。
 * 空内容或缺少逗号的行抛中文错误。
 */
export function importDeckCsv(csv: string, now: number = Date.now()): Flashcard[] {
  const lines = csv
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length === 0) throw new Error('CSV 内容为空')
  return lines.map((line, i) => {
    const idx = line.indexOf(',')
    if (idx === -1) throw new Error(`第 ${i + 1} 行缺少逗号分隔：${line}`)
    return newCard(line.slice(0, idx), line.slice(idx + 1), now, `card-${i + 1}`)
  })
}

/** 导出牌组为 JSON */
export function exportDeckJson(deck: Flashcard[]): string {
  return JSON.stringify(deck, null, 2)
}

/** 从 JSON 恢复牌组；格式非法抛中文错误 */
export function importDeckJson(json: string): Flashcard[] {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('JSON 格式无效')
  }
  if (!Array.isArray(raw)) throw new Error('牌组 JSON 必须为数组')
  return raw.map((item, i) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Flashcard).front !== 'string' ||
      typeof (item as Flashcard).back !== 'string'
    ) {
      throw new Error(`第 ${i + 1} 张卡片缺少正反面`)
    }
    const c = item as Partial<Flashcard>
    return {
      id: typeof c.id === 'string' ? c.id : `card-${i + 1}`,
      front: (c.front as string).trim(),
      back: (c.back as string).trim(),
      ease: typeof c.ease === 'number' ? c.ease : 2.5,
      interval: typeof c.interval === 'number' ? c.interval : 0,
      repetitions: typeof c.repetitions === 'number' ? c.repetitions : 0,
      due: typeof c.due === 'number' ? c.due : Date.now(),
    }
  })
}

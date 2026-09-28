/**
 * psychology（#839）工具函数：压力 / 焦虑自评量表计分。
 * 纯函数，无 DOM / 网络依赖。自评参考，非医学诊断。
 */

export interface ScaleQuestion {
  readonly id: string
  readonly text: string
}

export interface Scale {
  readonly id: string
  readonly name: string
  readonly note: string
  readonly questions: readonly ScaleQuestion[]
  /** 选项文本，下标即分值（0 起） */
  readonly options: readonly string[]
}

const FREQUENCY = ['从不', '很少', '有时', '经常', '总是'] as const

export const SCALES: readonly Scale[] = [
  {
    id: 'stress',
    name: '压力自评（PSS 简化版）',
    note: '回想过去一个月，你有多经常有以下感受？',
    options: FREQUENCY,
    questions: [
      { id: 's1', text: '因为意外事件而感到心烦意乱' },
      { id: 's2', text: '感觉无法掌控生活中的重要事情' },
      { id: 's3', text: '感到紧张和压力' },
      { id: 's4', text: '感觉事情堆积如山、难以应付' },
      { id: 's5', text: '因为想着必须完成的事而无法入睡' },
      { id: 's6', text: '感觉自己无法应对必须做的事' },
      { id: 's7', text: '对生活中的烦心事感到愤怒' },
      { id: 's8', text: '感觉困难多到无法克服' },
      { id: 's9', text: '对时间安排感到焦虑' },
      { id: 's10', text: '感觉精力被耗尽' },
    ],
  },
  {
    id: 'anxiety',
    name: '焦虑自评（GAD-7 简化版）',
    note: '回想过去两周，你有多经常被以下问题困扰？',
    options: FREQUENCY,
    questions: [
      { id: 'a1', text: '感到紧张、焦虑或急切' },
      { id: 'a2', text: '无法停止或控制担忧' },
      { id: 'a3', text: '对各种事情担忧过多' },
      { id: 'a4', text: '很难放松下来' },
      { id: 'a5', text: '坐立不安、难以静坐' },
      { id: 'a6', text: '容易烦躁或发脾气' },
      { id: 'a7', text: '感到害怕，好像可怕的事要发生' },
    ],
  },
]

export type Level = '正常' | '轻度' | '中度' | '重度'

/** 按 id 取量表；未知 id 抛中文错误 */
export function getScale(id: string): Scale {
  const s = SCALES.find((x) => x.id === id)
  if (!s) throw new Error(`未知的量表：${id}`)
  return s
}

export interface ScaleScore {
  readonly total: number
  readonly max: number
  readonly level: Level
}

/**
 * 计分：总分占满分的比例 ≤25% 正常，≤50% 轻度，≤75% 中度，否则重度。
 * 答案数量须与题数一致，每题分值须为有效下标。
 */
export function scoreScale(scaleId: string, answers: readonly number[]): ScaleScore {
  const scale = getScale(scaleId)
  if (answers.length !== scale.questions.length) {
    throw new Error(`请回答全部 ${scale.questions.length} 道题`)
  }
  answers.forEach((v, i) => {
    if (!Number.isInteger(v) || v < 0 || v >= scale.options.length) {
      throw new Error(`第 ${i + 1} 题答案无效`)
    }
  })
  const total = answers.reduce((s, v) => s + v, 0)
  const max = scale.questions.length * (scale.options.length - 1)
  const ratio = total / max
  const level: Level =
    ratio <= 0.25 ? '正常' : ratio <= 0.5 ? '轻度' : ratio <= 0.75 ? '中度' : '重度'
  return { total, max, level }
}

/** 结果格式化为可读文本 */
export function formatScore(scale: Scale, score: ScaleScore): string {
  return `${scale.name}\n总分：${score.total} / ${score.max}\n评估：${score.level}（自评参考，非医学诊断）`
}

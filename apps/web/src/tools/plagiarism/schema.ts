import { z } from 'zod'
import { THRESHOLDS } from './utils'

/** 输入契约：文档 A（主输入框）+ 文档 B/C（附加输入框） */
export const inputSchema = z.object({
  text: z.string(),
  docB: z.string().optional(),
  docC: z.string().optional(),
})

/** 选项契约：相似度阈值（下拉框传字符串） */
export const optionsSchema = z.object({
  threshold: z.enum(THRESHOLDS, { error: '阈值不在候选项内' }),
})

export type PlagiarismInput = z.infer<typeof inputSchema>
export type PlagiarismOptions = z.infer<typeof optionsSchema>

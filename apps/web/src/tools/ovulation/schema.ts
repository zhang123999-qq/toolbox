import { z } from 'zod'

/** 输入字符上限（与 utils 的具名常量保持一致） */
export const INPUT_MAX_CHARS = 200000

/**
 * 输入契约
 * - text：末次月经日期（YYYY-MM-DD）
 * - cycleLength：周期长度（天，留空=28）
 * - textB：参考日期（留空=今天）
 */
export const inputSchema = z.object({
  text: z.string().max(INPUT_MAX_CHARS, '输入超过 200,000 字符上限'),
  cycleLength: z.string().max(100, '周期长度过长'),
  textB: z.string().max(INPUT_MAX_CHARS, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type OvulationInput = z.infer<typeof inputSchema>
export type OvulationOptions = z.infer<typeof optionsSchema>

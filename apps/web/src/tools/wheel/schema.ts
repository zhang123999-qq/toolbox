import { z } from 'zod'

/**
 * 输入契约（#412 转盘）
 * - text：转盘选项，每行一个扇区（空行自动忽略；至少 2 个、上限 24 个）
 * - winners：获奖人数（字符串，utils 内做数值校验；0 = 合法，转盘空转）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  winners: z.string().max(100, '获奖人数过长'),
})

export const optionsSchema = z.object({})

export type WheelInput = z.infer<typeof inputSchema>
export type WheelOptions = z.infer<typeof optionsSchema>

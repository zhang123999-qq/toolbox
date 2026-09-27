import { z } from 'zod'

/**
 * 输入契约（#410 随机决定）
 * - text：选项列表，每行一个选项（空行自动忽略，重复选项按独立条目看待）
 * - count：抽取个数（字符串，utils 内做数值校验；0 = 合法，返回空结果）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  count: z.string().max(100, '抽取个数过长'),
})

/** 选项契约：allowRepeat=true 允许同一选项被重复抽中（有放回） */
export const optionsSchema = z.object({
  allowRepeat: z.boolean().default(false),
})

export type RandomDecisionInput = z.infer<typeof inputSchema>
export type RandomDecisionOptions = z.infer<typeof optionsSchema>

import { z } from 'zod'

/**
 * 输入契约（#411 抽签）
 * - text：抽签名单，每行一人（空行自动忽略，重复名字按独立条目看待）
 * - count：抽取人数（字符串，utils 内做数值校验；0 = 合法，返回空名单）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  count: z.string().max(100, '抽取人数过长'),
})

/** 选项契约：withReplacement=true 为有放回（允许重复中奖），false = 不放回 */
export const optionsSchema = z.object({
  withReplacement: z.boolean().default(false),
})

export type LotteryInput = z.infer<typeof inputSchema>
export type LotteryOptions = z.infer<typeof optionsSchema>

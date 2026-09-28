import { z } from 'zod'

/** 主输入：限流模拟 JSON（mode / requests / capacity / refillPerSec / limit / windowSec） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type ApiRateInput = z.infer<typeof inputSchema>

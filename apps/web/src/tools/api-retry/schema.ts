import { z } from 'zod'

/** 主输入：重试策略 JSON 配置 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type ApiRetryInput = z.infer<typeof inputSchema>

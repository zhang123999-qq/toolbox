import { z } from 'zod'

/** 主输入：SSE 地址 */
export const inputSchema = z.object({
  text: z.string().max(2000, '地址超过 2000 字符上限'),
})

/** 附加输入：自定义事件名（逗号分隔） */
export const extraSchema = z.object({
  events: z.string().max(2000, '事件名超过 2000 字符上限'),
})

export type SseInput = z.infer<typeof inputSchema>
export type SseExtra = z.infer<typeof extraSchema>

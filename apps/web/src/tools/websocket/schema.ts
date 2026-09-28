import { z } from 'zod'

/** 主输入：WebSocket 地址 */
export const inputSchema = z.object({
  text: z.string().max(2000, '地址超过 2000 字符上限'),
})

/** 附加输入：待发送的消息内容 */
export const extraSchema = z.object({
  message: z.string().max(200000, '消息内容超过 200000 字符上限'),
})

export type WebsocketInput = z.infer<typeof inputSchema>
export type WebsocketExtra = z.infer<typeof extraSchema>

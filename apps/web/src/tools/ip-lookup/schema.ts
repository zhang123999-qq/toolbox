import { z } from 'zod'

/** 输入契约：IPv4 或 IPv6 地址 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type IpLookupInput = z.infer<typeof inputSchema>
export type IpLookupOptions = z.infer<typeof optionsSchema>

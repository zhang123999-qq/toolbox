import { z } from 'zod'

/** 输入契约：MAC 地址串（生成模式下忽略） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode = 解析 / 生成 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('parse'), z.literal('generate')]),
})

export type MacInput = z.infer<typeof inputSchema>
export type MacOptions = z.infer<typeof optionsSchema>

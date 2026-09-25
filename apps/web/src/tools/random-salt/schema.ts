import { z } from 'zod'

/** 输入契约：输入框只作触发用，内容不参与计算 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：长度（字节数，用字符串承载以贴合下拉框）与输出编码 */
export const optionsSchema = z.object({
  length: z.union([z.literal('16'), z.literal('32'), z.literal('64')]),
  format: z.union([z.literal('hex'), z.literal('base64'), z.literal('base64url')]),
})

export type RandomSaltInput = z.infer<typeof inputSchema>
export type RandomSaltOptions = z.infer<typeof optionsSchema>

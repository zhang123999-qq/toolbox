import { z } from 'zod'

/** 输入契约：text=n，k=取几个（可空，默认 = n） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  k: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type PermutationInput = z.infer<typeof inputSchema>
export type PermutationOptions = z.infer<typeof optionsSchema>

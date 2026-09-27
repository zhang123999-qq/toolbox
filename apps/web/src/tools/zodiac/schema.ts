import { z } from 'zod'

/** 输入契约：只接收一段待解析的「月/日」文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type ZodiacInput = z.infer<typeof inputSchema>
export type ZodiacOptions = z.infer<typeof optionsSchema>

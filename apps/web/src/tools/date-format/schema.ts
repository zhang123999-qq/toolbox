import { z } from 'zod'

/** 输入契约：日期时间串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：格式串（自研 token） */
export const optionsSchema = z.object({
  pattern: z.string(),
})

export type DateFmtInput = z.infer<typeof inputSchema>
export type DateFmtOptions = z.infer<typeof optionsSchema>

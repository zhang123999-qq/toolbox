import { z } from 'zod'

/** 输入契约：日期时间串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：可选 IANA 时区，留空按浏览器本地时区 */
export const optionsSchema = z.object({
  zone: z.string(),
})

export type TsGenInput = z.infer<typeof inputSchema>
export type TsGenOptions = z.infer<typeof optionsSchema>

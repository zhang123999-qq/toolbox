import { z } from 'zod'

/** 输入契约：text=日期；options.locales=逗号分隔的 locale 列表 */
export const inputSchema = z.object({
  text: z.string().max(200, '日期超过 200 字符上限'),
})

export const optionsSchema = z.object({
  locales: z.string().max(500, '语言区域列表过长'),
})

export type DateLocaleInput = z.infer<typeof inputSchema>
export type DateLocaleOptions = z.infer<typeof optionsSchema>

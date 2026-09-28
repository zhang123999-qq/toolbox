import { z } from 'zod'

/** 输入契约：text=数字；options.locales=逗号分隔的 locale 列表 */
export const inputSchema = z.object({
  text: z.string().max(200, '数字超过 200 字符上限'),
})

export const optionsSchema = z.object({
  locales: z.string().max(500, '语言区域列表过长'),
})

export type NumberLocaleInput = z.infer<typeof inputSchema>
export type NumberLocaleOptions = z.infer<typeof optionsSchema>

import { z } from 'zod'

/** 输入契约：墙上时间串，如 2026-09-27 15:30:00 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：源时区 / 目标时区，均为 IANA 名 */
export const optionsSchema = z.object({
  fromZone: z.string(),
  toZone: z.string(),
})

export type TzConvertInput = z.infer<typeof inputSchema>
export type TzConvertOptions = z.infer<typeof optionsSchema>

import { z } from 'zod'

/** 输入契约：待转换的日期时间串（按源时区解释） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：源时区与目标时区（IANA 标识） */
export const optionsSchema = z.object({
  fromTz: z.string(),
  toTz: z.string(),
})

export type TzInput = z.infer<typeof inputSchema>
export type TzOptions = z.infer<typeof optionsSchema>

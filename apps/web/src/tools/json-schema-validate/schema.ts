import { z } from 'zod'

/** 输入契约：text 是待校验数据，textB 是 JSON Schema */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
  textB: z.string().max(1_000_000, 'Schema 超过 1,000,000 字符上限'),
})

/**
 * 选项契约：mode 决定报错只给第一条还是全部；
 * strict 决定遇到不支持的关键字时是报错还是忽略。
 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('all'), z.literal('first')]),
  strict: z.boolean(),
})

export type SchemaValidateInput = z.infer<typeof inputSchema>
export type SchemaValidateOptions = z.infer<typeof optionsSchema>

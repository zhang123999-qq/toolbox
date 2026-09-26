import { z } from 'zod'

/** 输入契约：一份 Avro Schema（JSON） */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode 决定输出哪几段；indent 决定 JSON Schema 的缩进宽度 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('both'), z.literal('tree'), z.literal('jsonSchema')]),
  indent: z.union([z.literal('2'), z.literal('4')]),
})

export type AvroParseInput = z.infer<typeof inputSchema>
export type AvroParseOptions = z.infer<typeof optionsSchema>

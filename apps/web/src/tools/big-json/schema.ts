import { z } from 'zod'

/**
 * 输入契约：比其它 JSON 工具宽松一个量级——本工具存在的意义就是看大文件。
 * 但仍要设上限，否则一次粘贴几百 MB 会把标签页拖死。
 */
export const inputSchema = z.object({
  text: z.string().max(8_000_000, '输入超过 8,000,000 字符上限'),
})

/** 选项契约：取样条数用字符串字面量，与模板 select 的取值保持一一对应 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('stats'), z.literal('paths'), z.literal('error')]),
  topN: z.union([z.literal('10'), z.literal('25'), z.literal('50')]),
})

export type BigJsonInput = z.infer<typeof inputSchema>
export type BigJsonOptions = z.infer<typeof optionsSchema>

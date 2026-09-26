import { z } from 'zod'

/** 输入契约：Properties 逐行扫描，上限收到 1MB 以免卡住主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：direction 决定方向，encoding 决定非 ASCII 是否转义，indent 决定 JSON 缩进 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('props2json'), z.literal('json2props')]),
  encoding: z.union([z.literal('unicode'), z.literal('escaped')]),
  indent: z.union([z.literal('2'), z.literal('4')]),
})

export type PropertiesInput = z.infer<typeof inputSchema>
export type PropertiesOptions = z.infer<typeof optionsSchema>

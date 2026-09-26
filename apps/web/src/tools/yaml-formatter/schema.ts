import { z } from 'zod'

/** 输入契约：YAML 逐行解析比 JSON.parse 慢，上限收到 1MB 以免卡住主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：mode 决定格式化还是只校验，indent 决定缩进档位 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('format'), z.literal('validate')]),
  indent: z.union([z.literal('2'), z.literal('4')]),
  sortKeys: z.boolean(),
})

export type YamlFormatterInput = z.infer<typeof inputSchema>
export type YamlFormatterOptions = z.infer<typeof optionsSchema>

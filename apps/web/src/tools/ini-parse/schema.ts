import { z } from 'zod'

/** 输入契约：INI 逐行扫描，上限收到 1MB 以免卡住主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：direction 决定转换方向，indent 决定 JSON 侧缩进档位 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('ini2json'), z.literal('json2ini')]),
  indent: z.union([z.literal('2'), z.literal('4')]),
})

export type IniInput = z.infer<typeof inputSchema>
export type IniOptions = z.infer<typeof optionsSchema>

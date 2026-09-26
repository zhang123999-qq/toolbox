import { z } from 'zod'

/** 输入框只作触发用，上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 分类过滤：all 输出全部 */
export const optionsSchema = z.object({
  category: z.union([
    z.literal('all'),
    z.literal('base'),
    z.literal('branch'),
    z.literal('remote'),
    z.literal('undo'),
    z.literal('stage'),
    z.literal('stash'),
    z.literal('log'),
    z.literal('tag'),
  ]),
})

export type GitCheatsheetInput = z.infer<typeof inputSchema>
export type GitCheatsheetOptions = z.infer<typeof optionsSchema>

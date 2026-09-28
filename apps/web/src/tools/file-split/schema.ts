import { z } from 'zod'

/** 输入契约：文件走上传入口；text 是切分参数（"10MB" 或 "5"） */
export const inputSchema = z.object({
  text: z.string().max(50, '切分参数不能超过 50 个字符'),
})

/** 选项契约：mode 按大小 / 按数量切分 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('size'), z.literal('count')]),
})

export type FileSplitInput = z.infer<typeof inputSchema>
export type FileSplitOptions = z.infer<typeof optionsSchema>

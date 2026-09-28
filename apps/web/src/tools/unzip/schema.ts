import { z } from 'zod'

/** 输入契约：压缩包走左下的文件入口；text 保留占位 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type UnzipInput = z.infer<typeof inputSchema>
export type UnzipOptions = z.infer<typeof optionsSchema>

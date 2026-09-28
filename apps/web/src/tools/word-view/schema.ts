import { z } from 'zod'

/** 输入契约：预览走输出区内的文件入口，text 框仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项（图片默认内嵌显示） */
export const optionsSchema = z.object({})

export type WordViewInput = z.infer<typeof inputSchema>
export type WordViewOptions = z.infer<typeof optionsSchema>

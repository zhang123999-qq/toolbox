import { z } from 'zod'

/** 输入契约：预览走输出区内的文件入口，text 框仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项（幻灯片切换在输出区内完成） */
export const optionsSchema = z.object({})

export type PptViewInput = z.infer<typeof inputSchema>
export type PptViewOptions = z.infer<typeof optionsSchema>

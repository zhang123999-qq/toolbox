import { z } from 'zod'

/** 本工具输入只有文件（走自定义文件入口），text 占位 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：背景色只能取预设值 */
export const optionsSchema = z.object({
  color: z.union([
    z.literal('gray'),
    z.literal('blue'),
    z.literal('yellow'),
    z.literal('green'),
    z.literal('pink'),
  ]),
})

export type PdfBackgroundInput = z.infer<typeof inputSchema>
export type PdfBackgroundOptions = z.infer<typeof optionsSchema>

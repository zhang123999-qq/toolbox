import { z } from 'zod'

/** 输入契约：text 是待编码的文本（按 UTF-8）；文件走左下的文件入口 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '文本不能超过 500 万字符'),
})

/** 选项契约：dataUrl 为 true 时输出 data:<mime>;base64,… */
export const optionsSchema = z.object({
  dataUrl: z.boolean(),
})

export type FileToBase64Input = z.infer<typeof inputSchema>
export type FileToBase64Options = z.infer<typeof optionsSchema>

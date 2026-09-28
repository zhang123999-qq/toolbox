import { z } from 'zod'

/** 输入契约：text 是 Base64 文本（可带 data: URL 前缀） */
export const inputSchema = z.object({
  text: z.string().max(20_000_000, 'Base64 文本不能超过 2000 万字符'),
})

/** 选项契约：filename 文件名（不含扩展名），extension 扩展名（含点可，不填用 dataURL 的或 .bin） */
export const optionsSchema = z.object({
  filename: z.string().max(200, '文件名不能超过 200 个字符'),
  extension: z.string().max(20, '扩展名不能超过 20 个字符'),
})

export type Base64ToFileInput = z.infer<typeof inputSchema>
export type Base64ToFileOptions = z.infer<typeof optionsSchema>

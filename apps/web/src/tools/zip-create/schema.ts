import { z } from 'zod'

/** 输入契约：文件走多文件上传入口；text 是压缩包文件名（不含扩展名） */
export const inputSchema = z.object({
  text: z.string().max(200, '压缩包文件名不能超过 200 个字符'),
})

/** 选项契约：level 为 fflate 的压缩级别 0–9（0 = 仅存储不压缩） */
export const optionsSchema = z.object({
  level: z.number().int().min(0).max(9),
})

export type ZipCreateInput = z.infer<typeof inputSchema>
export type ZipCreateOptions = z.infer<typeof optionsSchema>

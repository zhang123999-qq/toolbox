import { z } from 'zod'

/** 选项契约：format=输出格式；quality=JPEG 质量 1–100（PNG 不生效） */
export const optionsSchema = z.object({
  format: z.enum(['png', 'jpeg']),
  quality: z.string().max(10, '质量取值过长'),
})

export type Base64ToImageOptions = z.infer<typeof optionsSchema>

/** 文本输入不经过 zod 校验，由组件内校验（空输入/非法字符/解码验证） */
export const inputSchema = z.object({
  text: z
    .string()
    .max(70 * 1024 * 1024)
    .optional(),
})

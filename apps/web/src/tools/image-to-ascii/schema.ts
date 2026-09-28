import { z } from 'zod'

/** 选项契约：charWidth=输出宽度字符数（10–200，空=80）；charset=字符集；invert=反色；color=彩色模式 */
export const optionsSchema = z.object({
  charWidth: z.string().max(10, '宽度取值过长'),
  charset: z.enum(['standard', 'simple', 'blocks']),
  invert: z.enum(['on', 'off']),
  color: z.enum(['on', 'off']),
})

export type ImageToAsciiOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})

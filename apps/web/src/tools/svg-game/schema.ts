import { z } from 'zod'

/** 主输入：可选的模板 id 与颜色（示例用） */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type SvgGameToolInput = z.infer<typeof inputSchema>

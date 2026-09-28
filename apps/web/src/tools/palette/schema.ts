import { z } from 'zod'

/** 输入契约：text=基础色（#rgb / #rrggbb / CSS 颜色名，留空=随机基础色） */
export const inputSchema = z.object({
  text: z.string().max(100, '颜色输入过长'),
})

/** 选项契约：mode=配色模式，count=颜色数量，format=导出格式 */
export const optionsSchema = z.object({
  mode: z.string().max(40, '模式取值过长').optional(),
  count: z.string().max(10, '数量取值过长').optional(),
  format: z.string().max(20, '格式取值过长').optional(),
})

export type PaletteInput = z.infer<typeof inputSchema>
export type PaletteOptions = z.infer<typeof optionsSchema>

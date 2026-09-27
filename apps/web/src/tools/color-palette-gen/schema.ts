import { z } from 'zod'

/** 输入契约：text=基础色（#rgb / #rrggbb / CSS 颜色名，留空=随机基础色） */
export const inputSchema = z.object({
  text: z.string().max(100, '颜色输入过长'),
})

/**
 * 选项契约：mode=配色模式（标识串，合法性由 utils 校验并给出双语报错，
 * 不在此处用 z.enum，以便报错信息走 i18n 而非 Zod 默认文案）；
 * count=颜色数量（正整数，合法性同上）。
 */
export const optionsSchema = z.object({
  mode: z.string().max(40, '模式取值过长'),
  count: z.string().max(10, '颜色数量过长'),
})

export type ColorPaletteInput = z.infer<typeof inputSchema>
export type ColorPaletteOptions = z.infer<typeof optionsSchema>

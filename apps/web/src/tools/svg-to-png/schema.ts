import { z } from 'zod'

/**
 * 选项契约：
 * width/height=输出像素（字符串，空串=自然尺寸）；
 * background=背景模式；customColor=自定义背景色（background=custom 时有效）
 */
export const optionsSchema = z.object({
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
  background: z.enum(['transparent', 'white', 'custom']),
  customColor: z.string().max(20, '颜色取值过长'),
})

export type SvgToPngOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/内容） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})

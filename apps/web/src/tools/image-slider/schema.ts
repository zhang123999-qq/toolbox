import { z } from 'zod'

/**
 * 选项契约：direction=对比方向
 *  - horizontal：左右对比，分隔线为竖线，滑块百分比表示上层图（图 A/前图）显示的左侧宽度占比
 *  - vertical：上下对比，分隔线为横线，滑块百分比表示上层图（图 A/前图）显示的上方高度占比
 */
export const optionsSchema = z.object({
  direction: z.enum(['horizontal', 'vertical']),
})

export type ImageSliderOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})

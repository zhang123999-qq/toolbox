import { z } from 'zod'

/** 输入契约：text=多行「日期 | 标题 | 描述（可选）」事件 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：direction=排列方向，showGap=是否标注事件间隔天数 */
export const optionsSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']),
  showGap: z.boolean(),
})

export type TimelineGenInput = z.infer<typeof inputSchema>
export type TimelineGenOptions = z.infer<typeof optionsSchema>

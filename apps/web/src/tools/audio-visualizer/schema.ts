import { z } from 'zod'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：可视化样式（三选一） */
export const optionsSchema = z.object({
  style: z.enum(['bars', 'wave', 'circle'], { error: '可视化样式只能是 bars / wave / circle' }),
})

export type AudioVisualizerInput = z.infer<typeof inputSchema>
export type AudioVisualizerOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AudioVisualizerFormOptions {
  style: string
}

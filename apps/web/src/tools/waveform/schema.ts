import { z } from 'zod'

/** 输入契约：音频走文件入口；左侧文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：缩放通过界面按钮控制，这里保留空对象以统一结构 */
export const optionsSchema = z.object({})

export type WaveformInput = z.infer<typeof inputSchema>
export type WaveformOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 对应（空） */
export type WaveformFormOptions = Record<string, never>

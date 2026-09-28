import { z } from 'zod'

/** 输入契约：无文本输入，纯浏览器能力工具 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：是否同时录制系统/麦克风音频（浏览器允许才生效） */
export const optionsSchema = z.object({
  withAudio: z.coerce.boolean(),
})

export type ScreenRecorderInput = z.infer<typeof inputSchema>
export type ScreenRecorderOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 同构 */
export interface ScreenRecorderFormOptions {
  withAudio: boolean
}

import { z } from 'zod'

/** 输入契约：文件走文件入口（只读前 64 字节头）；左侧文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：本工具无可调选项 */
export const optionsSchema = z.object({})

export type AudioFormatInput = z.infer<typeof inputSchema>
export type AudioFormatOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 对应（空） */
export type AudioFormatFormOptions = Record<string, never>

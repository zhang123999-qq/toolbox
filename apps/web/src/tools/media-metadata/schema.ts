import { z } from 'zod'

/** 输入契约：媒体文件走文件入口；文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type MediaMetadataInput = z.infer<typeof inputSchema>
export type MediaMetadataOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：空对象 */
export interface MediaMetadataFormOptions {
  readonly [key: string]: never
}

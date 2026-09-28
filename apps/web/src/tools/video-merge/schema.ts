import { z } from 'zod'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：是否重编码（统一 H.264 + AAC，解决多视频编码不一致问题） */
export const optionsSchema = z.object({
  reencode: z.coerce.boolean(),
})

export type VideoMergeInput = z.infer<typeof inputSchema>
export type VideoMergeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 同构 */
export interface VideoMergeFormOptions {
  reencode: boolean
}

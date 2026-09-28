import { z } from 'zod'

/**
 * 选项契约：本工具输出固定为 PNG，format 仅保留枚举形式以兼容目录结构。
 * 截取流程无用户可调参数，组件内不渲染选项 UI。
 */
export const optionsSchema = z.object({
  format: z.enum(['png']),
})

export type ScreenCaptureOptions = z.infer<typeof optionsSchema>

import { z } from 'zod'

/** 输入契约：无文本输入，纯浏览器能力工具 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：导出图片的最长边（像素），过大自动等比缩小 */
export const optionsSchema = z.object({
  maxSide: z.coerce
    .number({ error: '最长边必须是数字' })
    .int({ error: '最长边必须是整数' })
    .min(160, { error: '最长边不能小于 160 像素' })
    .max(4096, { error: '最长边不能超过 4096 像素' }),
})

export type CameraPhotoInput = z.infer<typeof inputSchema>
export type CameraPhotoOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface CameraPhotoFormOptions {
  maxSide: string
}

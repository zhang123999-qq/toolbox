import { z } from 'zod'

/** 输入契约：图片走文件入口；文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：扫描来源（摄像头 / 上传图片） */
export const optionsSchema = z.object({
  mode: z.enum(['camera', 'image'], { error: '扫描模式非法' }),
})

export type BarcodeScanMediaInput = z.infer<typeof inputSchema>
export type BarcodeScanMediaOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：与 optionsSchema 同构 */
export interface BarcodeScanMediaFormOptions {
  mode: 'camera' | 'image'
}
